export interface SingleSubscription {
  id: string;
  email: string;
  startDate: string;
  startTime: string;
  duration: number;
  note?: string;
}

export interface FamilySubscription {
  id: string;
  familyEmail: string;
  members: string[];
  startDate: string;
  startTime: string;
  duration: number;
  planType: 'regular' | 'renewal';
  note?: string;
}

export type SubscriptionStatus = 'active' | 'warning' | 'critical' | 'expired';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export type ModalMode = 'add' | 'edit';
export type TabType = 'single' | 'family';
