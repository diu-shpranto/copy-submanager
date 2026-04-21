import { SubscriptionStatus, TimeRemaining } from '../types';

export function calculateExpiry(startDate: string, startTime: string, duration: number): Date {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(startDate + 'T00:00:00');
  start.setHours(hours, minutes, 0, 0);
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + duration);
  return expiry;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getTimeRemaining(expiryDate: Date, now: Date): TimeRemaining {
  const total = expiryDate.getTime() - now.getTime();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, total };
}

export function getStatus(expiryDate: Date, now: Date): SubscriptionStatus {
  const remaining = getTimeRemaining(expiryDate, now);
  if (remaining.total <= 0) return 'expired';
  if (remaining.days < 2) return 'critical';
  if (remaining.days < 7) return 'warning';
  return 'active';
}

export function formatCountdown(remaining: TimeRemaining): string {
  if (remaining.total <= 0) return 'Expired';
  const d = String(remaining.days).padStart(2, '0');
  const h = String(remaining.hours).padStart(2, '0');
  const m = String(remaining.minutes).padStart(2, '0');
  const s = String(remaining.seconds).padStart(2, '0');
  return `${d}d ${h}h ${m}m ${s}s`;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
