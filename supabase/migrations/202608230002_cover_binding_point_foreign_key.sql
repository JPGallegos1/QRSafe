drop index if exists public.qr_bindings_payment_point_id_idx;

create index qr_bindings_payment_point_business_idx
  on public.qr_bindings (payment_point_id, business_id);
