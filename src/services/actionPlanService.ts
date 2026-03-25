import { supabase } from '@/integrations/supabase/client';
import { ActionPlan, ActionStatus } from '@/types';

export const actionPlanService = {
  // Create action plan
  async createActionPlan(actionPlan: Omit<ActionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<ActionPlan> {
    const { data, error } = await supabase
      .from('action_plans')
      .insert([actionPlan])
      .select()
      .single();

    if (error) throw error;
    return data as ActionPlan;
  },

  // Get action plans for organization
  async getOrganizationActionPlans(organizationId: string): Promise<ActionPlan[]> {
    const { data, error } = await supabase
      .from('action_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get action plans for assessment
  async getAssessmentActionPlans(assessmentId: string): Promise<ActionPlan[]> {
    const { data, error } = await supabase
      .from('action_plans')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get action plans by category
  async getCategoryActionPlans(categoryId: string): Promise<ActionPlan[]> {
    const { data, error } = await supabase
      .from('action_plans')
      .select('*')
      .eq('category_id', categoryId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Update action plan
  async updateActionPlan(id: string, updates: Partial<ActionPlan>): Promise<ActionPlan> {
    const { data, error } = await supabase
      .from('action_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ActionPlan;
  },

  // Update action plan status
  async updateActionPlanStatus(id: string, status: ActionStatus): Promise<ActionPlan> {
    const updates: Partial<ActionPlan> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    return this.updateActionPlan(id, updates);
  },

  // Delete action plan
  async deleteActionPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('action_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get action plan by ID
  async getActionPlanById(id: string): Promise<ActionPlan | null> {
    const { data, error } = await supabase
      .from('action_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Create action plans from assessment results
  async createActionPlansFromAssessment(
    assessmentId: string,
    organizationId: string,
    categoryScores: Array<{ categoryId: string; categoryName: string; percentage: number }>
  ): Promise<ActionPlan[]> {
    // Sort by lowest scores - these are improvement areas
    const improvementAreas = categoryScores
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3); // Top 3 improvement areas

    const actionPlans: Omit<ActionPlan, 'id' | 'created_at' | 'updated_at'>[] = [];

    improvementAreas.forEach((area, index) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (90 * (index + 1))); // Staggered due dates

      actionPlans.push({
        organization_id: organizationId,
        assessment_id: assessmentId,
        category_id: area.categoryId,
        title: `Improve ${area.categoryName}`,
        description: `Current score: ${area.percentage.toFixed(1)}%. Develop action plan to enhance ${area.categoryName}. Focus areas: Process optimization, team engagement, and continuous improvement initiatives.`,
        priority: 5 - index, // Higher priority for lower scores
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0]
      });
    });

    // Batch insert all action plans
    const { data, error } = await supabase
      .from('action_plans')
      .insert(actionPlans)
      .select();

    if (error) throw error;
    return data as ActionPlan[];
  },

  // Get action plan statistics
  async getActionPlanStats(organizationId: string) {
    const plans = await this.getOrganizationActionPlans(organizationId);

    return {
      total: plans.length,
      pending: plans.filter(p => p.status === 'pending').length,
      inProgress: plans.filter(p => p.status === 'in_progress').length,
      completed: plans.filter(p => p.status === 'completed').length,
      overdue: plans.filter(p => p.status === 'overdue').length
    };
  }
};
