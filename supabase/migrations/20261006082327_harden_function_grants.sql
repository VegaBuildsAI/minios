-- MiniOS · harden_function_grants
-- Reduce the public RPC surface of helper and trigger functions.

-- Keep a fixed path for this trigger helper and remove its default PUBLIC grant.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.apply_stock_movement() from public;
revoke all on function public.deduct_stock_on_sale() from public;
revoke all on function public.handle_new_user() from public;

-- These two helpers are used by RLS policies. Authenticated sessions need them;
-- anonymous clients must not be able to call them through the Data API.
revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated, service_role;
revoke all on function public.is_owner_up() from public;
grant execute on function public.is_owner_up() to authenticated, service_role;

-- Make the new usage table explicit for the Data API while keeping it private to
-- signed-in users. This remains correct if automatic public-schema exposure is off.
revoke all on table public.ai_usage from anon;
grant select on table public.ai_usage to authenticated;

revoke all on function public.ai_sales_summary(timestamptz, timestamptz) from public;
grant execute on function public.ai_sales_summary(timestamptz, timestamptz) to authenticated, service_role;
