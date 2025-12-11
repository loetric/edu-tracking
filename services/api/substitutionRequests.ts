// Substitution Requests API functions
import { SubstitutionRequest, SubstitutionRequestStatus } from '../../types';
import { supabase } from '../supabase';
import { handleSupabaseError } from './errors';

/**
 * Get all substitution requests
 */
export const getSubstitutionRequests = async (): Promise<SubstitutionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('substitution_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(r => ({
      id: r.id,
      date: r.date,
      scheduleItemId: r.schedule_item_id,
      substituteTeacher: r.substitute_teacher,
      status: r.status as SubstitutionRequestStatus,
      rejectionReason: r.rejection_reason,
      requestedAt: r.requested_at,
      respondedAt: r.responded_at,
      requestedBy: r.requested_by
    })) as SubstitutionRequest[];
  } catch (error) {
    console.error('Get substitution requests error:', error);
    return [];
  }
};

/**
 * Get pending requests for a specific teacher
 */
export const getPendingRequestsForTeacher = async (teacherName: string): Promise<SubstitutionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('substitution_requests')
      .select('*')
      .eq('substitute_teacher', teacherName)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(r => ({
      id: r.id,
      date: r.date,
      scheduleItemId: r.schedule_item_id,
      substituteTeacher: r.substitute_teacher,
      status: r.status as SubstitutionRequestStatus,
      rejectionReason: r.rejection_reason,
      requestedAt: r.requested_at,
      respondedAt: r.responded_at,
      requestedBy: r.requested_by
    })) as SubstitutionRequest[];
  } catch (error) {
    console.error('Get pending requests for teacher error:', error);
    return [];
  }
};

/**
 * Create a new substitution request
 */
export const createSubstitutionRequest = async (request: Omit<SubstitutionRequest, 'id' | 'requestedAt' | 'status'>): Promise<SubstitutionRequest> => {
  try {
    const { data, error } = await supabase
      .from('substitution_requests')
      .insert([{
        date: request.date,
        schedule_item_id: request.scheduleItemId,
        substitute_teacher: request.substituteTeacher,
        status: 'pending',
        requested_by: request.requestedBy
      }])
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      date: data.date,
      scheduleItemId: data.schedule_item_id,
      substituteTeacher: data.substitute_teacher,
      status: data.status as SubstitutionRequestStatus,
      rejectionReason: data.rejection_reason,
      requestedAt: data.requested_at,
      respondedAt: data.responded_at,
      requestedBy: data.requested_by
    };
  } catch (error) {
    console.error('Create substitution request error:', error);
    throw error;
  }
};

/**
 * Accept a substitution request
 */
export const acceptSubstitutionRequest = async (requestId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('substitution_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('Accept substitution request error:', error);
    throw error;
  }
};

/**
 * Reject a substitution request
 */
export const rejectSubstitutionRequest = async (requestId: string, rejectionReason: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('substitution_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('Reject substitution request error:', error);
    throw error;
  }
};

/**
 * Delete a substitution request
 */
export const deleteSubstitutionRequest = async (requestId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('substitution_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('Delete substitution request error:', error);
    throw error;
  }
};

