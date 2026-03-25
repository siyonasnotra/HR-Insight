import { supabase } from '@/integrations/supabase/client';
import { Certification, CertificationLevel } from '@/types';

interface CertificationWithDetails extends Certification {
  organizations?: {
    name: string;
  };
  assessments?: {
    overall_score: number;
  };
}

export const certificationService = {
  // Generate verification code
  generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase() + 
           Math.random().toString(36).substring(2, 15).toUpperCase();
  },

  // Create certification after assessment completion
  async createCertification(
    organizationId: string,
    assessmentId: string,
    level: CertificationLevel,
    expiryYears: number = 2
  ) {
    const verificationCode = this.generateVerificationCode();
    const expiredAt = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + expiryYears);

    const { data, error } = await supabase
      .from('certifications')
      .insert([{
        organization_id: organizationId,
        assessment_id: assessmentId,
        level,
        verification_code: verificationCode,
        expires_at: expiredAt.toISOString(),
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Certification;
  },

  // Get certification by organization
  async getCertificationByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('issued_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data as Certification | null;
  },

  // Verify certification by code
  async verifyCertification(verificationCode: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*, organizations(name), assessments(overall_score)')
      .eq('verification_code', verificationCode)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all certifications for an organization
  async getOrganizationCertifications(organizationId: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data as Certification[];
  },

  // Check if certification is expiring soon (within 30 days)
  async getExpiringSoon(organizationId: string, daysThreshold: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lt('expires_at', futureDate.toISOString());

    if (error) throw error;
    return data as Certification[];
  },

  // Renew certification by completing a new assessment
  async renewCertification(
    organizationId: string,
    newAssessmentId: string,
    newLevel: CertificationLevel
  ) {
    // Deactivate old certification
    const oldCert = await this.getCertificationByOrganization(organizationId);
    if (oldCert) {
      await supabase
        .from('certifications')
        .update({ is_active: false })
        .eq('id', oldCert.id);
    }

    // Create new certification
    return this.createCertification(organizationId, newAssessmentId, newLevel);
  },

  // Generate certificate PDF (preparation for future implementation)
  async generateCertificateURL(certificationId: string): Promise<string> {
    const { data, error } = await supabase
      .from('certifications')
      .select('*, organizations(name), assessments(overall_score)')
      .eq('id', certificationId)
      .single();

    if (error) throw error;

    // TODO: Integrate with a PDF generation service (e.g., jsPDF, html2pdf, or backend service)
    // For now, return a placeholder URL
    const cert = data as CertificationWithDetails;
    const certificateUrl = `/certificates/${certificationId}-${cert.organizations.name}.pdf`;
    
    // Update certificate URL
    await supabase
      .from('certifications')
      .update({ certificate_url: certificateUrl })
      .eq('id', certificationId);

    return certificateUrl;
  },

  // Get certification statistics
  async getCertificationStats() {
    const { data, error } = await supabase
      .from('certifications')
      .select('level')
      .eq('is_active', true);

    if (error) throw error;

    const stats = {
      diamond: 0,
      gold: 0,
      silver: 0,
      none: 0,
      total: data?.length || 0
    };

    data?.forEach((cert: Certification) => {
      if (cert.level in stats) {
        stats[cert.level as CertificationLevel]++;
      }
    });

    return stats;
  },

  // Get details for certificate display
  async getCertificateDetails(certificationId: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select(`
        *,
        organizations:organization_id(name, website, industry),
        assessments:assessment_id(overall_score, completed_at)
      `)
      .eq('id', certificationId)
      .single();

    if (error) throw error;
    return data;
  }
};
