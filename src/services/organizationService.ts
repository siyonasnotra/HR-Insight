import { supabase } from '@/integrations/supabase/client';
import { Organization, TeamInvitation, UserProfile } from '@/types';

export const organizationService = {
  // Anchor reference for Acne (or Acnew) corp
  ANCHOR_ORGANIZATION_ID: '49e4e2d1-bc30-4ec5-aa05-42425929790f',
  ANCHOR_ORGANIZATION_NAME: 'Acne Corporation',

  // Get all organizations
  async getOrganizations() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Organization[];
  },

  // Get organization by ID
  async getOrganizationById(id: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Organization;
  },

  // Create organization
  async createOrganization(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('organizations')
      .insert([org])
      .select()
      .single();
    
    if (error) throw error;
    return data as Organization;
  },

  // Update organization
  async updateOrganization(id: string, updates: Partial<Organization>) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Organization;
  },

  // Get organization members
  async getOrganizationMembers(orgId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', orgId);
    
    if (error) throw error;
    return data as UserProfile[];
  },

  // Send team invitation
  async sendTeamInvitation(invitation: Omit<TeamInvitation, 'id' | 'token' | 'created_at'>) {
    const { data, error } = await supabase
      .from('team_invitations')
      .insert([invitation])
      .select()
      .single();
    
    if (error) throw error;
    return data as TeamInvitation;
  },

  // Accept team invitation and assign role to user
  async acceptTeamInvitation(token: string, userId: string) {
    // 1. Get the invitation details to extract the role
    const { data: inviteData, error: inviteError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .single();
    
    if (inviteError) throw inviteError;
    if (!inviteData) throw new Error('Invitation not found');

    // 2. Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        accepted_at: new Date().toISOString()
      })
      .eq('token', token);
    
    if (updateError) throw updateError;

    // 3. Insert the user's role into user_roles table
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert([{
        user_id: userId,
        role: inviteData.role // Use the role from the invitation
      }], {
        onConflict: 'user_id'
      });

    if (roleError) {
      console.warn('Could not create/update user role:', roleError);
    }

    return inviteData;
  },

  // Get invitation by token
  async getInvitationByToken(token: string) {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*, organizations(*)')
      .eq('token', token)
      .is('accepted_at', null)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get invitations for email
  async getInvitations(email: string) {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*, organizations(*)')
      .eq('email', email)
      .is('accepted_at', null);
    
    if (error) throw error;
    return data;
  },

  // Find the anchor organization by ID or fuzzy name
  async findAnchorOrganization() {
    const { data: byId, error: idError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', this.ANCHOR_ORGANIZATION_ID)
      .maybeSingle();

    if (idError) {
      console.warn('Failed to query anchor organization by ID:', idError);
    }

    if (byId) {
      return byId as Organization;
    }

    const lowerName = this.ANCHOR_ORGANIZATION_NAME.toLowerCase();

    const { data: byName, error: nameError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', `%${lowerName}%`)
      .limit(1)
      .single();

    if (nameError && nameError.code !== 'PGRST116') {
      console.warn('Failed to query anchor organization by name:', nameError);
    }

    return byName as Organization | null;
  },

  async syncAnchorOrganization() {
    const anchorOrg = await this.findAnchorOrganization();
    if (!anchorOrg) {
      throw new Error('Anchor organization not found: Acne/Acnew corporation');
    }
    return this.syncOrganizationData(anchorOrg.id);
  },

  // Sync and update an organization record from its latest assessment data
  async syncOrganizationData(orgId: string) {
    try {
      const { data: assessments, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, status, overall_score, certification_level, completed_at')
        .eq('organization_id', orgId)
        .order('completed_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      let updates: Partial<Organization> = {
        latest_assessment_id: null,
        latest_score: null,
        latest_status: null,
      };

      if (assessmentError) throw assessmentError;

      if (assessments && assessments.length > 0) {
        const latest = assessments[0];
        updates = {
          latest_assessment_id: latest.id,
          latest_score: latest.overall_score ?? null,
          latest_status: latest.status ?? null,
        };
      }

      const { data: orgData, error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId)
        .select()
        .single();

      if (updateError) throw updateError;
      return orgData as Organization;
    } catch (error) {
      console.error('Failed to sync organization data:', error);
      throw error;
    }
  },

  // Remove team member
  async removeTeamMember(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};
