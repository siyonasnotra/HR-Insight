-- =============================================================================
-- Sync orphaned assessments to their correct organizations
-- Fixes: Acne Corporation and any other org whose assessments have NULL or
-- incorrect organization_id by joining through the user's profile record.
-- =============================================================================

-- STEP 1: Fix assessments that have NULL organization_id
--   → If the user who created the assessment has an organization_id in their
--     profile, copy that organization_id onto the assessment.
UPDATE public.assessments a
SET organization_id = p.organization_id
FROM public.profiles p
WHERE a.organization_id IS NULL
  AND a.user_id = p.user_id
  AND p.organization_id IS NOT NULL;

-- STEP 2: Fix assessments that point to a non-existent organization_id
--   → Replace with the creator profile's org if the foreign key is broken.
UPDATE public.assessments a
SET organization_id = p.organization_id
FROM public.profiles p
WHERE a.user_id = p.user_id
  AND p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = a.organization_id
  );

-- STEP 3: Backfill organizations.latest_assessment_id / latest_score / latest_status
--   for ALL organizations so the trigger values are in sync with current data.
--   This covers Acne Corporation and every other org.
WITH ranked AS (
  SELECT
    a.organization_id,
    a.id             AS assessment_id,
    a.status,
    a.overall_score,
    ROW_NUMBER() OVER (
      PARTITION BY a.organization_id
      ORDER BY
        -- Prefer completed assessments; then order by created_at desc
        CASE WHEN a.status = 'completed' THEN 0 ELSE 1 END,
        a.created_at DESC
    ) AS rn
  FROM public.assessments a
  WHERE a.organization_id IS NOT NULL
)
UPDATE public.organizations o
SET
  latest_assessment_id = r.assessment_id,
  latest_status        = r.status,
  latest_score         = r.overall_score
FROM ranked r
WHERE r.rn = 1
  AND o.id = r.organization_id;

-- STEP 4: For organizations with NO assessments at all, set fields to NULL
--   (prevents stale data from old trigger runs).
UPDATE public.organizations o
SET
  latest_assessment_id = NULL,
  latest_status        = NULL,
  latest_score         = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessments a WHERE a.organization_id = o.id
)
AND (o.latest_assessment_id IS NOT NULL OR o.latest_status IS NOT NULL);

-- STEP 5: Verify Acne Corporation specifically
--   (This is a DO block so it logs but doesn't fail if the org doesn't exist)
DO $$
DECLARE
  v_org_id   UUID;
  v_count    INT;
  v_score    NUMERIC;
  v_status   TEXT;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE LOWER(name) LIKE '%acne%'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Acne Corporation not found in organizations table.';
  ELSE
    SELECT COUNT(*), MAX(overall_score), MAX(status)
    INTO v_count, v_score, v_status
    FROM public.assessments
    WHERE organization_id = v_org_id;

    RAISE NOTICE 'Acne Corporation (id=%) — assessments linked: %, latest score: %, latest status: %',
      v_org_id, v_count, v_score, v_status;
  END IF;
END;
$$;
