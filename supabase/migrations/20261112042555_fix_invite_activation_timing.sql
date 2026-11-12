create or replace function private.require_admin_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  consumed uuid;
begin
  -- Supabase Auth adds custom app metadata after inserting the user.
  update private.account_invites as invite
  set used_at = now()
  from auth.users as account
  where account.id = new.id
    and invite.id::text = account.raw_app_meta_data->>'ecociclo_invite_id'
    and invite.email = lower(account.email)
    and invite.used_at is null
    and invite.expires_at > now()
    and exists (
      select 1 from public.user_roles
      where user_id = invite.issued_by and role = 'admin'
    )
  returning invite.id into consumed;

  if consumed is null then
    raise exception 'A criação de conta exige um convite da administração.' using errcode = '42501';
  end if;
  return null;
end;
$$;

drop trigger require_ecociclo_invite on auth.users;

create constraint trigger require_ecociclo_invite
after insert on auth.users
deferrable initially deferred
for each row execute function private.require_admin_invitation();
