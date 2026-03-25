-- =============================================================================
-- Admin RPC function to fetch all platform users (FLAT VERSION)
-- Matches exactly with the frontend mapping logic.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_super_admin_users()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check
  IF NOT (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'::public.app_role
    )
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'email', p.email,
      'organization_id', p.organization_id,
      'created_at', p.created_at,
      'organization_name', o.name,
      'role', r.role
    )
  FROM public.profiles p
  LEFT JOIN public.organizations o ON p.organization_id = o.id
  LEFT JOIN public.user_roles r ON p.user_id = r.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_super_admin_users() TO authenticated;

COMMIT;
