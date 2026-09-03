-- CEOs.fun mirror. Applied via the Supabase MCP as migration `ceos_mirror`.
--
-- Three tables. The chain is the source of truth; this is what the site reads
-- when the RPC is down and what the cycle job writes every five minutes.

create table if not exists mints (
  asset       text primary key,
  class_id    int  not null,
  serial      int  not null,
  owner       text not null,
  minter      text,
  signature   text,
  cluster     text not null default 'devnet',
  -- false = inserted by a browser after its own mint; true = seen on-chain by
  -- the cycle job. Unverified rows older than 15 minutes are pruned.
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mints_cluster_created on mints (cluster, created_at desc);
create index if not exists mints_owner on mints (cluster, owner);

create table if not exists wallets (
  address     text primary key,
  cluster     text not null default 'devnet',
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  connections int not null default 1
);

create table if not exists snapshots (
  id           bigserial primary key,
  cluster      text not null,
  created_at   timestamptz not null default now(),
  config       jsonb,
  engine       jsonb,
  pot_sol      numeric,
  total_minted int
);
create index if not exists snapshots_cluster_created on snapshots (cluster, created_at desc);

-- Row-level security: anon reads everything, writes only what is provisional.
alter table mints     enable row level security;
alter table wallets   enable row level security;
alter table snapshots enable row level security;

create policy mints_read      on mints     for select to anon, authenticated using (true);
create policy wallets_read    on wallets   for select to anon, authenticated using (true);
create policy snapshots_read  on snapshots for select to anon, authenticated using (true);
create policy mints_provisional on mints for insert to anon, authenticated with check (verified = false);

-- Upsert a connected wallet without granting UPDATE to anon.
create or replace function touch_wallet(p_address text, p_cluster text default 'devnet')
returns void language sql security definer set search_path = public as $$
  insert into wallets (address, cluster) values (p_address, p_cluster)
  on conflict (address) do update
    set last_seen = now(), connections = wallets.connections + 1;
$$;
grant execute on function touch_wallet(text, text) to anon, authenticated;
