-- Eclipse matcher — NeonDB schema. Mirrors on-chain EclipseOrderRegistry state for fast
-- queries (stats, history, pagination) that would otherwise require re-scanning event logs.
-- The chain remains the source of truth; this is an index, never authoritative on its own.

create table if not exists orders (
  order_id      bigint primary key,
  owner         text not null,
  token_in      text not null,
  token_out     text not null,
  amount_in     numeric not null,
  min_amount_out numeric not null,
  wave_id       bigint not null,
  expiry        bigint not null,
  status        smallint not null default 0, -- 0 Open, 1 Cancelled, 2 Locked, 3 Settled
  tx_hash       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_owner_idx on orders (owner);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_wave_idx on orders (wave_id);

create table if not exists waves (
  wave_id             bigint primary key,
  pool_id             text not null,
  order_ids           bigint[] not null default '{}',
  gross_buy           numeric not null default 0,
  gross_sell          numeric not null default 0,
  internal_matched    numeric not null default 0,
  net_amount          numeric not null default 0,
  net_side            text, -- 'buy' | 'sell'
  commitment_root     text,
  lock_tx_hash        text,
  execution_tx_hash   text,
  status              text not null default 'pending', -- pending | locked | executed | settled | failed
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists commitments (
  commitment     text primary key,
  order_id       bigint,
  owner          text not null,
  token_in       text not null,
  token_out      text not null,
  amount_in      numeric not null,
  min_amount_out numeric not null,
  expiry         bigint not null,
  secret         text not null,
  wave_id        bigint not null,
  revealed       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists commitments_owner_idx on commitments (owner);
create index if not exists commitments_wave_idx on commitments (wave_id);
create index if not exists commitments_revealed_idx on commitments (revealed);

create table if not exists sync_state (
  key          text primary key,
  last_block   bigint not null
);
