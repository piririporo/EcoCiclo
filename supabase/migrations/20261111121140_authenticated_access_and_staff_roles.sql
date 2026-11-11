-- The catalog, impact metrics and recycling partners are available after sign-in.
alter policy listings_read on public.product_listings to authenticated;
alter policy compatibility_read on public.component_compatibility to authenticated;
alter policy partners_read on public.recycling_partners to authenticated;
revoke select on public.product_listings, public.component_compatibility, public.recycling_partners from anon;
revoke execute on function public.impact_metrics(), private.impact_metrics(), private.has_role(text) from anon;

create or replace function private.new_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  chosen_name text := left(trim(new.raw_user_meta_data->>'display_name'), 120);
begin
  insert into public.profiles(id, display_name)
    values (new.id, case when length(chosen_name) >= 2 then chosen_name else 'Novo usuário' end);
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  insert into public.carts(user_id) values (new.id);
  return new;
end
$$;

-- Cover accounts that existed before the foundation trigger was installed.
insert into public.profiles(id, display_name)
select id, case when length(trim(raw_user_meta_data->>'display_name')) >= 2
  then left(trim(raw_user_meta_data->>'display_name'), 120) else 'Novo usuário' end
from auth.users
on conflict (id) do nothing;
insert into public.user_roles(user_id, role)
select id, 'user' from auth.users on conflict (user_id, role) do nothing;
insert into public.carts(user_id)
select id from auth.users on conflict (user_id) do nothing;

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
  if actor = target_user and new_role = 'admin' and not enabled then
    raise exception 'Não remova seu próprio acesso administrativo.' using errcode = '42501';
  end if;

  -- Serialize changes so two administrators cannot revoke one another concurrently.
  perform pg_advisory_xact_lock(820141, 1);
  if not private.has_role('admin') then
    raise exception 'Acesso exclusivo da administração.' using errcode = '42501';
  end if;

  if enabled then
    if not exists (select 1 from auth.users where id = target_user and email_confirmed_at is not null) then
      raise exception 'A conta precisa confirmar o e-mail antes de receber permissões.' using errcode = '22023';
    end if;
    insert into public.user_roles(user_id, role)
      values (target_user, new_role)
      on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = target_user and role = new_role;
  end if;
end
$$;

create or replace function private.audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs(actor_id, table_name, record_id, action)
  values (auth.uid(), tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'user_id', to_jsonb(old)->>'user_id'),
    tg_op);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

alter policy recycling_requests_read on public.recycling_requests
using (
  owner_id = (select auth.uid())
  or (select private.has_role('admin'))
  or (
    (select private.has_role('recycler'))
    and exists (
      select 1 from public.recycling_partners
      where id = partner_id and active and user_id = (select auth.uid())
    )
  )
);

create or replace function private.advance_recycling(request_uuid uuid, new_status text, mass numeric, proof text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  request public.recycling_requests;
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Entre na sua conta.'; end if;
  select * into request from public.recycling_requests where id = request_uuid for update;
  if not found then raise exception 'Encaminhamento não encontrado.'; end if;

  if not (
    private.has_role('admin')
    or (private.has_role('recycler') and exists (
      select 1 from public.recycling_partners
      where id = request.partner_id and user_id = actor and active
    ))
  ) then
    raise exception 'Acesso restrito ao parceiro responsável.' using errcode = '42501';
  end if;
  if request.partner_id is null then
    raise exception 'Cadastre e vincule o parceiro antes do encaminhamento.';
  end if;
  if new_status is null or not (
    (request.status = 'awaiting' and new_status = 'requested')
    or (request.status = 'requested' and new_status = 'received')
    or (request.status = 'received' and new_status = 'confirmed')
  ) then
    raise exception 'Transição de destinação inválida.';
  end if;
  if new_status = 'confirmed' then
    if mass is null or mass <= 0 or proof is null or not exists (
      select 1 from storage.objects
      where bucket_id = 'recycling-proofs' and name = proof
        and (storage.foldername(name))[1] = actor::text
        and (storage.foldername(name))[2] = request.id::text
    ) then
      raise exception 'Informe a massa e envie um comprovante válido.';
    end if;
    insert into public.recycling_records(request_id, partner_id, recorded_by, mass_grams, proof_path)
      values (request.id, request.partner_id, actor, mass, proof);
  end if;
  update public.recycling_requests set status = new_status where id = request.id;
end
$$;
