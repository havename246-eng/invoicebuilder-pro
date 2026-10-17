-- Run in Supabase dashboard → SQL Editor. Returns one JSON cell: save it as
-- supabase-users.json for scripts/migrate-supabase-users.ts.
--
-- The output contains bcrypt password hashes. Keep the file private, never
-- commit it, and delete it once the import is done.
select coalesce(json_agg(json_build_object(
  'id', u.id,
  'email', u.email,
  'encrypted_password', u.encrypted_password,
  'email_confirmed_at', u.email_confirmed_at,
  'created_at', u.created_at,
  'last_sign_in_at', u.last_sign_in_at,
  'raw_user_meta_data', u.raw_user_meta_data,
  'identities', (
    select json_agg(json_build_object(
      'provider', i.provider,
      'provider_id', i.provider_id,
      'identity_data', i.identity_data
    ))
    from auth.identities i
    where i.user_id = u.id
  )
)), '[]'::json) as users
from auth.users u
where u.deleted_at is null;
