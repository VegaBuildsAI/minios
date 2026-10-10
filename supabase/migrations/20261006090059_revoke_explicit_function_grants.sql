-- MiniOS · revoke_explicit_function_grants
-- Supabase projects can retain explicit anon/authenticated EXECUTE grants even
-- after PUBLIC is revoked. Remove them from trigger-only functions and from the
-- anonymous role on helpers used by RLS.

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;
revoke execute on function public.deduct_stock_on_sale() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;

revoke execute on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;
revoke execute on function public.is_owner_up() from public, anon;
grant execute on function public.is_owner_up() to authenticated, service_role;

-- This RPC intentionally remains available to signed-in users so Config can
-- display the daily AI budget; anonymous callers must not execute it.
revoke execute on function public.ai_spend_today() from public, anon;
grant execute on function public.ai_spend_today() to authenticated, service_role;
