-- Add latest assessment columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS latest_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latest_score NUMERIC,
ADD COLUMN IF NOT EXISTS latest_status TEXT,
ADD COLUMN IF NOT EXISTS latest_report_url TEXT;

-- Create function to update organization with latest assessment info
CREATE OR REPLACE FUNCTION public.update_organization_latest_assessment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if it's an assessment being completed or updated
    IF NEW.status = 'completed' THEN
        -- Check if it's the newest completed assessment (or the only one)
        -- We just update it if the completed_at is newer or we don't have one
        UPDATE public.organizations
        SET latest_assessment_id = NEW.id,
            latest_status = NEW.status::text,
            latest_score = NEW.overall_score
        WHERE id = NEW.organization_id;
    ELSIF NEW.status != 'completed' THEN
        -- Only update if the organization's latest assessment is this one
        UPDATE public.organizations
        SET latest_status = NEW.status::text,
            latest_score = NEW.overall_score
        WHERE id = NEW.organization_id 
        AND latest_assessment_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_org_latest_assessment ON public.assessments;
CREATE TRIGGER trigger_update_org_latest_assessment
AFTER INSERT OR UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_latest_assessment();
