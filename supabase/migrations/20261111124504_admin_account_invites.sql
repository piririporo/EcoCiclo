alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('user', 'technician', 'admin', 'recycler', 'primary_admin'));
create unique index one_primary_administrator on public.user_roles(role) where role = 'primary_admin';

create or replace function private.grant_role(target_user uuid, new_role text, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if not private.has_role('admin') then
    raise exception 'Acesso exclusivo da administração.' using errcode = '42501';
  end if;
  if target_user is null or enabled is null or new_role is null
      or new_role not in ('technician', 'admin', 'recycler') then
    raise exception 'Alteração de permissão inválida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(820141, 1);
  if not private.has_role('admin') then
    raise exception 'Acesso exclusivo da administração.' using errcode = '42501';
  end if;
  if new_role = 'admin' then
    if not private.has_role('primary_admin') then
      raise exception 'Somente o administrador principal pode alterar o acesso administrativo.' using errcode = '42501';
    end if;
    if actor = target_user and not enabled then
      raise exception 'Não remova seu próprio acesso administrativo.' using errcode = '42501';
    end if;
  end if;

  if enabled then
    if not exists (select 1 from auth.users where id = target_user and email_confirmed_at is not null) then
      raise exception 'A conta precisa confirmar o e-mail antes de receber permissões.' using errcode = '22023';
    end if;
    insert into public.user_roles(user_id, role) values (target_user, new_role)
      on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = target_user and role = new_role;
  end if;
end
$$;

create table private.account_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null check (length(display_name) between 2 and 120),
  token_hash bytea not null unique,
  issued_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
revoke all on table private.account_invites from public, anon, authenticated;

create function private.issue_account_invite(account_email text, account_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(account_email));
  display_name text := trim(account_name);
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  invite_id uuid;
begin
  if not private.has_role('admin') then
    raise exception 'Acesso exclusivo da administração.' using errcode = '42501';
  end if;
  if normalized_email is null or length(normalized_email) > 254
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or display_name is null or length(display_name) not between 2 and 120 then
    raise exception 'Informe um nome e um e-mail válidos.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = normalized_email) then
    raise exception 'Já existe uma conta para este e-mail.' using errcode = '23505';
  end if;

  insert into private.account_invites(email, display_name, token_hash, issued_by, expires_at)
  values (normalized_email, display_name, sha256(convert_to(token, 'UTF8')), auth.uid(), now() + interval '24 hours')
  on conflict (email) do update set
    id = excluded.id,
    display_name = excluded.display_name,
    token_hash = excluded.token_hash,
    issued_by = excluded.issued_by,
    expires_at = excluded.expires_at,
    used_at = null
  returning id into invite_id;

  insert into public.audit_logs(actor_id, table_name, record_id, action)
  values (auth.uid(), 'account_invites', invite_id::text, 'INVITE_ISSUED');
  return token;
end
$$;

create function public.issue_account_invite(account_email text, account_name text)
returns text language sql security invoker set search_path = '' as $$
  select private.issue_account_invite(account_email, account_name)
$$;
revoke all on function private.issue_account_invite(text, text), public.issue_account_invite(text, text)
  from public, anon, authenticated;
grant execute on function private.issue_account_invite(text, text), public.issue_account_invite(text, text)
  to authenticated;

create function private.find_account_invite(invite_token text)
returns table (id uuid, email text, display_name text)
language sql stable security definer set search_path = '' as $$
  select invite.id, invite.email, invite.display_name
  from private.account_invites invite
  where invite.token_hash = sha256(convert_to(invite_token, 'UTF8'))
    and invite.used_at is null and invite.expires_at > now()
    and exists (select 1 from public.user_roles
      where user_id = invite.issued_by and role = 'admin')
$$;

create function public.find_account_invite(invite_token text)
returns table (id uuid, email text, display_name text)
language sql stable security invoker set search_path = '' as $$
  select * from private.find_account_invite(invite_token)
$$;
revoke all on function private.find_account_invite(text), public.find_account_invite(text)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.find_account_invite(text), public.find_account_invite(text)
  to service_role;

create function private.require_admin_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  consumed uuid;
begin
  update private.account_invites invite
  set used_at = now()
  where invite.id::text = new.raw_app_meta_data->>'ecociclo_invite_id'
    and invite.email = lower(new.email)
    and invite.used_at is null and invite.expires_at > now()
    and exists (select 1 from public.user_roles
      where user_id = invite.issued_by and role = 'admin')
  returning invite.id into consumed;

  if consumed is null then
    raise exception 'A criação de conta exige um convite da administração.' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke all on function private.require_admin_invitation() from public, anon, authenticated;
create trigger require_ecociclo_invite before insert on auth.users
for each row execute function private.require_admin_invitation();
