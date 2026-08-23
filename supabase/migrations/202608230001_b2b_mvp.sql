-- QRSafe B2B MVP schema.
-- RLS is enabled intentionally without policies. Browser clients cannot read or
-- write these tables; the server-side API uses SUPABASE_SECRET_KEY, whose role
-- bypasses RLS. Do not expose that key to either frontend application.

create extension if not exists pgcrypto;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  tax_id text check (tax_id is null or char_length(tax_id) between 1 and 30),
  representative_name text not null check (char_length(representative_name) between 1 and 200),
  verification_status text not null default 'draft'
    check (verification_status in ('draft', 'submitted', 'verified', 'rejected')),
  verification_submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_points (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  address text check (address is null or char_length(address) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.qr_bindings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_point_id uuid not null,
  payload_sha256 text not null unique check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  destination_confirmed boolean not null check (destination_confirmed),
  extracted_data jsonb not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (payment_point_id, business_id)
    references public.payment_points(id, business_id) on delete cascade
);

create index payment_points_business_id_idx on public.payment_points (business_id);
create index qr_bindings_business_id_idx on public.qr_bindings (business_id);
create index qr_bindings_payment_point_id_idx on public.qr_bindings (payment_point_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger payment_points_set_updated_at
before update on public.payment_points
for each row execute function public.set_updated_at();

create trigger qr_bindings_set_updated_at
before update on public.qr_bindings
for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.payment_points enable row level security;
alter table public.qr_bindings enable row level security;
