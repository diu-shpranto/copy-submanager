// filepath: src/hooks/useSubscriptionApi.ts
import { useState, useEffect, useCallback } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';

const API_BASE = 'http://localhost:5000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'secure_session_active',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function useSubscriptionApi() {
  const [singles, setSingles] = useState<SingleSubscription[]>([]);
  const [families, setFamilies] = useState<FamilySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all subscriptions on mount
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchApi<{ single: any[]; family: any[] }>('/all-subscriptions');
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      // Transform MongoDB data to match our types
      const singleSubs = (result.data.single || []).map((item: any) => {
        // Handle MongoDB ObjectId - could be string, could have $oid
        const id = item._id?.$oid || item._id?.toString() || item.id || item._id;
        
        // Convert durationDays/durationHours back to duration (days as decimal)
        const durationDays = parseInt(item.durationDays || 0, 10);
        const durationHours = parseInt(item.durationHours || 0, 10);
        const duration = durationDays + (durationHours / 24);
        
        return {
          id: String(id),
          email: item.email,
          startDate: item.startDate,
          startTime: item.startTime,
          duration: duration,
          note: item.note,
          durationHours: item.durationHours,
          categoryId: item.categoryId,
        };
      });
      
      const familySubs = (result.data.family || []).map((item: any) => {
        // Handle MongoDB ObjectId
        const id = item._id?.$oid || item._id?.toString() || item.id || item._id;
        
        // Convert durationDays/durationHours back to duration
        const durationDays = parseInt(item.durationDays || 0, 10);
        const durationHours = parseInt(item.durationHours || 0, 10);
        const duration = durationDays + (durationHours / 24);
        
        return {
          id: String(id),
          familyEmail: item.familyEmail || item.email,
          members: item.members || item.familyMembers || [],
          startDate: item.startDate,
          startTime: item.startTime,
          duration: duration,
          planType: item.planType || 'regular',
          note: item.note,
          durationHours: item.durationHours,
          managerEmail: item.managerEmail,
        };
      });
      
      setSingles(singleSubs);
      setFamilies(familySubs);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Add single subscription
  const addSingle = useCallback(async (sub: Omit<SingleSubscription, 'id'>): Promise<boolean> => {
    // Convert duration (days) to durationDays and durationHours
    const durationDays = Math.floor(sub.duration || 30);
    const durationHours = Math.round(((sub.duration || 30) - durationDays) * 24);
    
    const result = await fetchApi('/add-single', {
      method: 'POST',
      body: JSON.stringify({
        email: sub.email,
        startDate: sub.startDate,
        startTime: sub.startTime,
        durationDays,
        durationHours,
        note: sub.note,
        categoryId: sub.categoryId,
      }),
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  // Add family subscription
  const addFamily = useCallback(async (sub: Omit<FamilySubscription, 'id'>): Promise<boolean> => {
    // Convert duration (days) to durationDays and durationHours
    const durationDays = Math.floor(sub.duration || 30);
    const durationHours = Math.round(((sub.duration || 30) - durationDays) * 24);
    
    const result = await fetchApi('/add-family', {
      method: 'POST',
      body: JSON.stringify({
        familyEmail: sub.familyEmail,
        members: sub.members,
        startDate: sub.startDate,
        startTime: sub.startTime,
        durationDays,
        durationHours,
        planType: sub.planType || 'regular',
        note: sub.note,
        managerEmail: sub.managerEmail,
      }),
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  // Update subscription
  const updateSubscription = useCallback(async (
    id: string,
    type: 'single' | 'family',
    data: Partial<SingleSubscription | FamilySubscription>
  ): Promise<boolean> => {
    // Convert duration to durationDays and durationHours if present
    let updateData: any = { ...data };
    if (data.duration !== undefined) {
      const durationDays = Math.floor(data.duration);
      const durationHours = Math.round((data.duration - durationDays) * 24);
      updateData = {
        ...updateData,
        durationDays,
        durationHours,
      };
    }
    
    const result = await fetchApi(`/update-sub/${id}?type=${type}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  // Renew subscription
  const renewSubscription = useCallback(async (
    id: string,
    type: 'single' | 'family',
    startDate: string,
    startTime: string,
    durationDays: number,
    durationHours: number
  ): Promise<boolean> => {
    const result = await fetchApi(`/renew-sub/${id}?type=${type}`, {
      method: 'PUT',
      body: JSON.stringify({
        startDate,
        startTime,
        durationDays,
        durationHours,
      }),
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  // Delete subscription
  const deleteSubscription = useCallback(async (
    id: string,
    type: 'single' | 'family'
  ): Promise<boolean> => {
    const result = await fetchApi(`/delete-sub/${id}?type=${type}`, {
      method: 'DELETE',
    });

    if (result.error) {
      setError(result.error);
      return false;
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  return {
    singles,
    families,
    loading,
    error,
    refetch: fetchAll,
    addSingle,
    addFamily,
    updateSubscription,
    renewSubscription,
    deleteSubscription,
  };
}