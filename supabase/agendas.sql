-- Schema aislado para Agendas.
-- Ejecutar en Supabase SQL Editor con el proyecto que ya usa el login.
create schema if not exists agendas;

create table if not exists agendas.prospectos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text,
  nombre text not null,
  tel text not null,
  tipo text not null default '',
  estatus text not null default 'Interesado'
    check (estatus in ('Interesado', 'En proceso', 'Cerrado', 'Perdido')),
  fecha date,
  fecha_cierre date,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agendas.prospectos
  add column if not exists fecha_cierre date;
alter table agendas.prospectos
  add column if not exists source_id text;

create table if not exists agendas.ventas (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references agendas.prospectos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  producto text not null,
  fecha_cierre date not null,
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ventas_prospecto_id_created_at_idx
  on agendas.ventas (prospecto_id, created_at desc);

create index if not exists prospectos_user_id_created_at_idx
  on agendas.prospectos (user_id, created_at desc);
create unique index if not exists prospectos_user_source_id_key
  on agendas.prospectos (user_id, source_id)
  where source_id is not null and source_id <> '';

-- Compartir un registro individual con otro usuario.
create table if not exists agendas.prospecto_shares (
  prospecto_id uuid not null references agendas.prospectos(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  primary key (prospecto_id, recipient_id)
);

-- Registros que sus propietarios decidieron publicar en la agenda general.
create table if not exists agendas.agenda_general (
  prospecto_id uuid primary key references agendas.prospectos(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  published_at timestamptz not null default now()
);

create index if not exists prospecto_shares_recipient_idx
  on agendas.prospecto_shares (recipient_id, prospecto_id);
create index if not exists agenda_general_owner_idx
  on agendas.agenda_general (owner_id, published_at desc);

alter table agendas.prospectos enable row level security;
alter table agendas.ventas enable row level security;

drop policy if exists "Users can read their own prospectos" on agendas.prospectos;
drop policy if exists "Users can read visible prospectos" on agendas.prospectos;
create policy "Users can read visible prospectos"
on agendas.prospectos for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from agendas.prospecto_shares s
    where s.prospecto_id = id and s.recipient_id = auth.uid()
  )
);

drop policy if exists "Users can create their own prospectos" on agendas.prospectos;
create policy "Users can create their own prospectos"
on agendas.prospectos for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own prospectos" on agendas.prospectos;
drop policy if exists "Users can edit shared prospectos" on agendas.prospectos;
drop policy if exists "Users can update shared prospectos" on agendas.prospectos;
create policy "Users can update shared prospectos"
on agendas.prospectos for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from agendas.prospecto_shares s
    where s.prospecto_id = id and s.recipient_id = auth.uid() and s.permission = 'edit'
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1 from agendas.prospecto_shares s
    where s.prospecto_id = id and s.recipient_id = auth.uid() and s.permission = 'edit'
  )
);

drop policy if exists "Users can delete their own prospectos" on agendas.prospectos;
drop policy if exists "Users can delete shared prospectos" on agendas.prospectos;
create policy "Users can delete their own prospectos"
on agendas.prospectos for delete
using (auth.uid() = user_id);

alter table agendas.prospecto_shares enable row level security;
alter table agendas.agenda_general enable row level security;

drop policy if exists "Owners manage prospecto shares" on agendas.prospecto_shares;
create policy "Owners manage prospecto shares" on agendas.prospecto_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Recipients read prospecto shares" on agendas.prospecto_shares;
create policy "Recipients read prospecto shares" on agendas.prospecto_shares
  for select using (auth.uid() = recipient_id);

drop policy if exists "Users read general agenda" on agendas.agenda_general;
create policy "Users read general agenda" on agendas.agenda_general
  for select using (auth.uid() is not null);
drop policy if exists "Owners manage general agenda" on agendas.agenda_general;
create policy "Owners manage general agenda" on agendas.agenda_general
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

grant usage on schema agendas to authenticated;
grant select, insert, update, delete on agendas.prospectos to authenticated;
grant select, insert on agendas.ventas to authenticated;
grant select on agendas.prospecto_shares to authenticated;
grant select on agendas.agenda_general to authenticated;

drop policy if exists "Users can read their own ventas" on agendas.ventas;
create policy "Users can read their own ventas"
on agendas.ventas for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own ventas" on agendas.ventas;
create policy "Users can create their own ventas"
on agendas.ventas for insert with check (auth.uid() = user_id);

-- RPCs: el cliente no necesita conocer correos ni exponer perfiles completos.
create or replace function agendas.share_prospecto_with_username(
  target_prospecto_id uuid,
  target_username text,
  target_permission text default 'view'
)
returns void language plpgsql security definer set search_path = public, agendas
as $$
declare recipient uuid;
begin
  if target_permission not in ('view', 'edit') then
    raise exception 'Permiso inválido';
  end if;
  select p.id into recipient from public.profiles p
    where lower(p.username) = lower(trim(target_username));
  if recipient is null then raise exception 'No existe ese usuario'; end if;
  if recipient = auth.uid() then raise exception 'No puedes compartir contigo mismo'; end if;
  if not exists (select 1 from agendas.prospectos where id = target_prospecto_id and user_id = auth.uid()) then
    raise exception 'No tienes permiso sobre este prospecto';
  end if;
  insert into agendas.prospecto_shares(prospecto_id, owner_id, recipient_id, permission)
    values (target_prospecto_id, auth.uid(), recipient, target_permission)
    on conflict (prospecto_id, recipient_id) do update set permission = excluded.permission;
end;
$$;

create or replace function agendas.revoke_prospecto_share(target_prospecto_id uuid, target_recipient_id uuid)
returns void language sql security definer set search_path = public, agendas
as $$
  delete from agendas.prospecto_shares
  where prospecto_id = target_prospecto_id and owner_id = auth.uid() and recipient_id = target_recipient_id;
$$;

create or replace function agendas.list_prospecto_shares(target_prospecto_id uuid)
returns table(recipient_id uuid, recipient_username text, permission text)
language sql security definer set search_path = public, agendas
as $$
  select s.recipient_id, p.username, s.permission
  from agendas.prospecto_shares s join public.profiles p on p.id = s.recipient_id
  where s.prospecto_id = target_prospecto_id and s.owner_id = auth.uid();
$$;

-- Lista mínima de usuarios disponibles para compartir: solo el identificador visible.
create or replace function agendas.list_shareable_users()
returns table(username text)
language sql security definer set search_path = public, agendas
as $$
  select p.username
  from public.profiles p
  where p.id <> auth.uid()
    and nullif(trim(p.username), '') is not null
  order by lower(p.username);
$$;

create or replace function agendas.list_visible_prospectos()
returns table(id uuid, user_id uuid, nombre text, tel text, tipo text, estatus text, fecha date, fecha_cierre date, notas text, created_at timestamptz, access text, owner_username text)
language sql security definer set search_path = public, agendas
as $$
  select p.id, p.user_id, p.nombre, p.tel, p.tipo, p.estatus, p.fecha, p.fecha_cierre, p.notas, p.created_at,
    case when p.user_id = auth.uid() then 'owner' else s.permission end,
    coalesce(owner_profile.username, '')
  from agendas.prospectos p
  left join agendas.prospecto_shares s on s.prospecto_id = p.id and s.recipient_id = auth.uid()
  left join public.profiles owner_profile on owner_profile.id = p.user_id
  where p.user_id = auth.uid() or s.recipient_id = auth.uid();
$$;

create or replace function agendas.publish_prospecto_general(target_prospecto_id uuid)
returns void language sql security definer set search_path = public, agendas
as $$
  insert into agendas.agenda_general(prospecto_id, owner_id)
  select id, auth.uid() from agendas.prospectos where id = target_prospecto_id and user_id = auth.uid()
  on conflict (prospecto_id) do nothing;
$$;

create or replace function agendas.remove_prospecto_from_general(target_prospecto_id uuid)
returns void language sql security definer set search_path = public, agendas
as $$
  delete from agendas.agenda_general where prospecto_id = target_prospecto_id and owner_id = auth.uid();
$$;

create or replace function agendas.list_general_prospectos()
returns table(id uuid, user_id uuid, nombre text, tel text, tipo text, estatus text, fecha date, fecha_cierre date, notas text, created_at timestamptz, owner_username text, published_at timestamptz, is_owner boolean)
language sql security definer set search_path = public, agendas
as $$
  select p.id, p.user_id, p.nombre, p.tel, p.tipo, p.estatus, p.fecha, p.fecha_cierre, p.notas, p.created_at,
    coalesce(owner_profile.username, ''), g.published_at, g.owner_id = auth.uid()
  from agendas.agenda_general g join agendas.prospectos p on p.id = g.prospecto_id
  left join public.profiles owner_profile on owner_profile.id = p.user_id
  order by g.published_at desc;
$$;

revoke all on function agendas.share_prospecto_with_username(uuid, text, text) from public;
revoke all on function agendas.revoke_prospecto_share(uuid, uuid) from public;
revoke all on function agendas.list_prospecto_shares(uuid) from public;
revoke all on function agendas.list_shareable_users() from public;
revoke all on function agendas.list_visible_prospectos() from public;
revoke all on function agendas.publish_prospecto_general(uuid) from public;
revoke all on function agendas.remove_prospecto_from_general(uuid) from public;
revoke all on function agendas.list_general_prospectos() from public;
grant execute on function agendas.share_prospecto_with_username(uuid, text, text) to authenticated;
grant execute on function agendas.revoke_prospecto_share(uuid, uuid) to authenticated;
grant execute on function agendas.list_prospecto_shares(uuid) to authenticated;
grant execute on function agendas.list_shareable_users() to authenticated;

create or replace function agendas.get_current_username()
returns table(username text)
language sql security definer set search_path = public, agendas
as $$
  select p.username
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function agendas.get_current_username() from public;
grant execute on function agendas.get_current_username() to authenticated;
grant execute on function agendas.list_visible_prospectos() to authenticated;
grant execute on function agendas.publish_prospecto_general(uuid) to authenticated;
grant execute on function agendas.remove_prospecto_from_general(uuid) to authenticated;
grant execute on function agendas.list_general_prospectos() to authenticated;

-- Tabla temporal para importar directamente los CSV exportados desde Apps Script.
-- Sus nombres coinciden exactamente con los encabezados de la hoja.
create table if not exists agendas.prospectos_import (
  "ID" text,
  "Nombre" text,
  "Celuar" text,
  "TDC" text,
  "Status" text,
  "Fecha Seguimiento" text,
  "Comentario" text,
  "Fecha de registro" text,
  "Fecha cierre" text,
  owner_username text
);

alter table agendas.prospectos_import
  add column if not exists "Fecha cierre" text;

alter table agendas.prospectos_import
  add column if not exists "Celuar" text;

alter table agendas.prospectos_import
  add column if not exists "TDC" text;

alter table agendas.prospectos_import
  add column if not exists "Status" text;

alter table agendas.prospectos_import
  add column if not exists "Fecha Seguimiento" text;

alter table agendas.prospectos_import
  add column if not exists "Comentario" text;

alter table agendas.prospectos_import
  add column if not exists "Fecha de registro" text;

-- Relación de los registros que ya pertenecían a la agenda general en Apps Script.
-- Debe contener el ID original y el usuario propietario de la hoja.
create table if not exists agendas.agenda_general_import (
  "ID" text not null,
  owner_username text not null,
  published_at text
);

create or replace function agendas.parse_import_date(value text)
returns date language plpgsql immutable
as $$
begin
  if nullif(trim(value), '') is null then return null; end if;
  if trim(value) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return trim(value)::date; end if;
  if trim(value) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' then return to_date(trim(value), 'DD/MM/YYYY'); end if;
  return null;
exception when others then return null;
end;
$$;

-- Supabase Dashboard > Settings > API > Exposed schemas:
-- agrega "agendas" para que supabase-js pueda consultar este schema.

-- Migración opcional desde un CSV exportado de la hoja "Prospectos":
-- 1. Crea una tabla temporal con los encabezados exactos de Apps Script:
--    ID, Nombre, Celuar, TDC, Status, Fecha Seguimiento, Comentario,
--    Fecha de registro y Fecha cierre.
-- 2. Agrega owner_username al CSV y coloca el username del propietario.
-- 3. Importa el CSV en agendas.prospectos_import.
-- 4. Ejecuta el INSERT usando las columnas entre comillas, por ejemplo:
--
-- insert into agendas.prospectos
--   (user_id, nombre, tel, tipo, estatus, fecha, fecha_cierre, notas, created_at)
-- select p.id, i."Nombre", i."Celuar", i."TDC",
--   case when i."Status" in ('Interesado','En proceso','Cerrado','Perdido')
--     then i."Status" else 'Interesado' end,
--   case when nullif(trim(i."Fecha Seguimiento"), '') is not null
--     then to_date(trim(i."Fecha Seguimiento"), 'DD/MM/YYYY') end,
--   case when nullif(trim(i."Fecha cierre"), '') is not null
--     then to_date(trim(i."Fecha cierre"), 'DD/MM/YYYY') end,
--   coalesce(i."Comentario", ''),
--   case when nullif(trim(i."Fecha de registro"), '') is not null
--     then to_timestamp(trim(i."Fecha de registro"), 'DD/MM/YYYY') else now() end
-- from agendas.prospectos_import i
-- join public.profiles p
--   on lower(p.username) = lower(trim(i.owner_username));

-- ============================================================================
-- MIGRACIÓN CONTROLADA DE CADA HOJA Y DE LA AGENDA GENERAL
-- ============================================================================
-- Antes de insertar, carga todos los CSV de las hojas en prospectos_import.
-- Cada fila debe conservar el ID original y llevar owner_username. Si exportas
-- una hoja por usuario, agrega la misma columna owner_username a todo el CSV.
-- Los encabezados exactos de Apps Script son: ID, Nombre, Celuar, TDC, Status,
-- Fecha Seguimiento, Comentario, Fecha de registro y Fecha cierre.

-- 1) Revisar propietarios que no existen en public.profiles. Esta consulta
-- debe devolver cero filas antes de ejecutar el INSERT.
-- select distinct trim(i.owner_username) as usuario_sin_perfil
-- from agendas.prospectos_import i
-- left join public.profiles p on lower(p.username) = lower(trim(i.owner_username))
-- where nullif(trim(i.owner_username), '') is not null and p.id is null;

-- 2) Revisar IDs repetidos dentro de la misma hoja/usuario.
-- select lower(trim(owner_username)) as usuario, trim("ID") as id_original, count(*)
-- from agendas.prospectos_import
-- where nullif(trim("ID"), '') is not null
-- group by lower(trim(owner_username)), trim("ID")
-- having count(*) > 1;

-- 3) Insertar los prospectos privados. El mismo usuario queda como dueño de
-- todos los registros que provienen de su hoja; no se importan notas de Manual.
-- La operación es idempotente por (user_id, source_id).
-- insert into agendas.prospectos
--   (user_id, source_id, nombre, tel, tipo, estatus, fecha, fecha_cierre, notas, created_at)
-- select p.id,
--   nullif(trim(i."ID"), ''),
--   coalesce(nullif(trim(i."Nombre"), ''), 'Sin nombre'),
--   coalesce(nullif(trim(i."Celuar"), ''), ''),
--   coalesce(i."TDC", ''),
--   case when i."Status" in ('Interesado','En proceso','Cerrado','Perdido')
--     then i."Status" else 'Interesado' end,
--   agendas.parse_import_date(i."Fecha Seguimiento"),
--   agendas.parse_import_date(i."Fecha cierre"),
--   coalesce(i."Comentario", ''),
--   coalesce(agendas.parse_import_date(i."Fecha de registro")::timestamptz, now())
-- from agendas.prospectos_import i
-- join public.profiles p
--   on lower(p.username) = lower(trim(i.owner_username))
-- where nullif(trim(i."ID"), '') is not null
-- on conflict (user_id, source_id) where source_id is not null and source_id <> '' do nothing;

-- 4) Validar la agenda general antigua. Carga en agenda_general_import un CSV
-- con estas columnas: ID, owner_username y opcionalmente published_at. El ID
-- debe ser el mismo ID original de la hoja privada del propietario.
-- select g.*
-- from agendas.agenda_general_import g
-- left join public.profiles u
--   on lower(u.username) = lower(trim(g.owner_username))
-- left join agendas.prospectos p
--   on p.user_id = u.id and p.source_id = trim(g."ID")
-- where u.id is null or p.id is null;

-- 5) Migrar esos clientes a la agenda general. Solo se publican registros que
-- ya existen y pertenecen al usuario indicado; no se crean duplicados.
-- insert into agendas.agenda_general (prospecto_id, owner_id, published_at)
-- select p.id, p.user_id,
--   coalesce(agendas.parse_import_date(g.published_at)::timestamptz, now())
-- from agendas.agenda_general_import g
-- join public.profiles u
--   on lower(u.username) = lower(trim(g.owner_username))
-- join agendas.prospectos p
--   on p.user_id = u.id and p.source_id = trim(g."ID")
-- on conflict (prospecto_id) do nothing;

-- 6) Comprobaciones posteriores.
-- select p.username, count(*) as prospectos_migrados
-- from agendas.prospectos a join public.profiles p on p.id = a.user_id
-- group by p.username order by p.username;
-- select count(*) as clientes_en_agenda_general from agendas.agenda_general;
