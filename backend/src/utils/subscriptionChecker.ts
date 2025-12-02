import { Subscription } from '../services/firebaseService';
import { Timestamp } from 'firebase-admin/firestore';

const GRACE_PERIOD_DAYS = 2;

/**
 * Helper to convert Firebase Timestamp to Date
 */
function timestampToDate(timestamp: Timestamp | Date | any): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Fallback for other formats
  return new Date(timestamp);
}

/**
 * Check if subscription is currently active
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * Check if subscription is within grace period (2 days after expiration)
 */
export function isInGracePeriod(subscription: Subscription | null): boolean {
  if (!subscription || !subscription.gracePeriodEnd) return false;
  
  const gracePeriodEnd = timestampToDate(subscription.gracePeriodEnd);
  const now = new Date();
  
  // Check if current time is before grace period end and after period end
  const periodEnd = timestampToDate(subscription.currentPeriodEnd);
  
  return now <= gracePeriodEnd && now > periodEnd;
}

/**
 * Check if user can access the portal (active subscription OR in grace period)
 */
export function canAccessPortal(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  // Active subscriptions can always access
  if (isSubscriptionActive(subscription)) {
    return true;
  }
  
  // Check if in grace period
  if (isInGracePeriod(subscription)) {
    return true;
  }
  
  return false;
}

/**
 * Calculate grace period end date (period end + 2 days)
 */
export function calculateGracePeriodEnd(periodEnd: Timestamp | Date): Timestamp {
  const periodEndDate = timestampToDate(periodEnd);
  const gracePeriodEnd = new Date(periodEndDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
  
  return Timestamp.fromDate(gracePeriodEnd);
}

