/**
 * Subscription Module
 * Payment plans and subscription management
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { Auth } from './auth.js';
import { Notify } from './notifications.js';

// Subscription Plans
export const PLANS = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly',
    price: 200,
    period: '1 Month',
    durationDays: 30,
    features: [
      'Full access to all features',
      'Unlimited transactions',
      'All categories & budgets',
      'Export to CSV & JSON',
      'Email support'
    ]
  },
  HALFYEARLY: {
    id: 'halfyearly',
    name: 'Half Yearly',
    price: 800,
    period: '6 Months',
    durationDays: 180,
    savings: 'Save ₹400',
    features: [
      'Full access to all features',
      'Unlimited transactions',
      'All categories & budgets',
      'Export to CSV & JSON',
      'Priority email support',
      'Advanced reports'
    ]
  },
  YEARLY: {
    id: 'yearly',
    name: 'Yearly',
    price: 2000,
    period: '1 Year',
    durationDays: 365,
    savings: 'Save ₹400',
    popular: true,
    features: [
      'Full access to all features',
      'Unlimited transactions',
      'All categories & budgets',
      'Export to CSV & JSON',
      'Priority email support',
      'Advanced reports',
      'Data backup & restore',
      'Future updates included'
    ]
  }
};

const TRIAL_DURATION_DAYS = 30;

/**
 * Initialize subscription system
 */
function init() {
  // Check and update subscription status on init
  checkSubscriptionStatus();
}

/**
 * Get all available plans
 * @returns {Object} Plans object
 */
function getPlans() {
  return PLANS;
}

/**
 * Get plan by ID
 * @param {string} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
function getPlan(planId) {
  return Object.values(PLANS).find(p => p.id === planId) || null;
}

/**
 * Check if user has active subscription or valid trial
 * @returns {Object} Status { isActive, isTrial, isExpired, daysRemaining, plan }
 */
function checkSubscriptionStatus() {
  const user = Auth.getCurrentUser();
  if (!user) {
    return { isActive: false, isTrial: false, isExpired: true, daysRemaining: 0, plan: null };
  }

  const now = new Date();
  const trialStart = new Date(user.trialStartDate);
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

  // Check if still in trial period
  if (now <= trialEnd && user.subscription.status === 'trial') {
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return { isActive: true, isTrial: true, isExpired: false, daysRemaining, plan: null };
  }

  // Check paid subscription
  if (user.subscription.status === 'active' && user.subscription.endDate) {
    const endDate = new Date(user.subscription.endDate);
    if (now <= endDate) {
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      return { 
        isActive: true, 
        isTrial: false, 
        isExpired: false, 
        daysRemaining, 
        plan: user.subscription.plan 
      };
    }
  }

  // Subscription expired
  if (user.subscription.status !== 'expired') {
    updateSubscriptionStatus(user.id, 'expired');
  }

  return { isActive: false, isTrial: false, isExpired: true, daysRemaining: 0, plan: user.subscription.plan };
}

/**
 * Subscribe to a plan
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @param {Object} paymentDetails - Payment details (simulated)
 * @returns {Object} Result { success, subscription, error }
 */
function subscribe(userId, planId, paymentDetails = {}) {
  const plan = getPlan(planId);
  if (!plan) {
    return { success: false, error: 'Invalid plan selected' };
  }

  const users = Auth.getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  // Simulate payment processing
  const paymentResult = processPayment(paymentDetails, plan);
  if (!paymentResult.success) {
    return { success: false, error: paymentResult.error };
  }

  // Calculate subscription dates
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // Update user subscription
  const subscription = {
    status: 'active',
    plan: planId,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    paymentHistory: [
      ...(users[index].subscription?.paymentHistory || []),
      {
        date: now.toISOString(),
        plan: planId,
        amount: plan.price,
        transactionId: paymentResult.transactionId,
        status: 'completed'
      }
    ]
  };

  users[index].subscription = subscription;
  users[index].updatedAt = now.toISOString();

  Storage.set(Auth.STORAGE_KEYS.USERS, users);

  // Update current user in state
  if (Auth.getCurrentUser()?.id === userId) {
    State.set('currentUser', users[index], false);
    Storage.set(Auth.STORAGE_KEYS.CURRENT_USER, users[index]);
  }

  Notify.success(`Successfully subscribed to ${plan.name} plan!`);

  return { success: true, subscription, error: null };
}

/**
 * Renew subscription
 * @param {string} userId - User ID
 * @param {Object} paymentDetails - Payment details
 * @returns {Object} Result { success, subscription, error }
 */
function renew(userId, paymentDetails = {}) {
  const user = Auth.getUserById(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const currentPlan = getPlan(user.subscription.plan);
  if (!currentPlan) {
    return { success: false, error: 'No active subscription plan found' };
  }

  return subscribe(userId, currentPlan.id, paymentDetails);
}

/**
 * Upgrade/Change plan
 * @param {string} userId - User ID
 * @param {string} newPlanId - New plan ID
 * @param {Object} paymentDetails - Payment details
 * @returns {Object} Result { success, subscription, error }
 */
function changePlan(userId, newPlanId, paymentDetails = {}) {
  const user = Auth.getUserById(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const newPlan = getPlan(newPlanId);
  if (!newPlan) {
    return { success: false, error: 'Invalid plan selected' };
  }

  // Calculate prorated amount if upgrading
  let amount = newPlan.price;
  if (user.subscription.status === 'active' && user.subscription.plan) {
    const currentPlan = getPlan(user.subscription.plan);
    if (currentPlan && currentPlan.price < newPlan.price) {
      const now = new Date();
      const endDate = new Date(user.subscription.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const dailyRate = currentPlan.price / currentPlan.durationDays;
      const remainingValue = dailyRate * daysRemaining;
      amount = Math.max(0, newPlan.price - remainingValue);
    }
  }

  // Process payment for new amount
  const paymentResult = processPayment({ ...paymentDetails, amount }, newPlan);
  if (!paymentResult.success) {
    return { success: false, error: paymentResult.error };
  }

  return subscribe(userId, newPlanId, paymentDetails);
}

/**
 * Cancel subscription
 * @param {string} userId - User ID
 * @returns {Object} Result { success, error }
 */
function cancel(userId) {
  const users = Auth.getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  if (users[index].subscription.status !== 'active') {
    return { success: false, error: 'No active subscription to cancel' };
  }

  // Keep subscription active until end date but mark as cancelled
  users[index].subscription.status = 'cancelled';
  users[index].subscription.cancelledAt = new Date().toISOString();
  users[index].updatedAt = new Date().toISOString();

  Storage.set(Auth.STORAGE_KEYS.USERS, users);

  if (Auth.getCurrentUser()?.id === userId) {
    State.set('currentUser', users[index], false);
    Storage.set(Auth.STORAGE_KEYS.CURRENT_USER, users[index]);
  }

  Notify.success('Subscription cancelled. You can still use the app until the end of your billing period.');

  return { success: true, error: null };
}

/**
 * Update subscription status
 * @param {string} userId - User ID
 * @param {string} status - New status
 */
function updateSubscriptionStatus(userId, status) {
  const users = Auth.getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) return;

  users[index].subscription.status = status;
  users[index].updatedAt = new Date().toISOString();

  Storage.set(Auth.STORAGE_KEYS.USERS, users);

  if (Auth.getCurrentUser()?.id === userId) {
    State.set('currentUser', users[index], false);
    Storage.set(Auth.STORAGE_KEYS.CURRENT_USER, users[index]);
  }
}

/**
 * Get subscription details for display
 * @returns {Object} Subscription details
 */
function getSubscriptionDetails() {
  const user = Auth.getCurrentUser();
  if (!user) return null;

  const status = checkSubscriptionStatus();
  const plan = status.plan ? getPlan(status.plan) : null;

  return {
    ...status,
    planDetails: plan,
    trialStartDate: user.trialStartDate,
    subscription: user.subscription,
    paymentHistory: user.subscription?.paymentHistory || []
  };
}

/**
 * Simulate payment processing
 * @param {Object} paymentDetails - Payment details
 * @param {Object} plan - Plan details
 * @returns {Object} Payment result
 */
function processPayment(paymentDetails, plan) {
  // Simulate payment processing delay
  // In a real app, this would integrate with a payment gateway like Stripe, Razorpay, etc.
  
  const requiredFields = ['cardNumber', 'expiryDate', 'cvv'];
  for (const field of requiredFields) {
    if (!paymentDetails[field]) {
      return { success: false, error: `Missing payment detail: ${field}` };
    }
  }

  // Simulate validation
  if (paymentDetails.cardNumber.length < 13) {
    return { success: false, error: 'Invalid card number' };
  }

  // Generate mock transaction ID
  const transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

  return { 
    success: true, 
    transactionId,
    amount: plan.price,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if feature is accessible
 * @returns {boolean} True if user can access features
 */
function canAccessFeatures() {
  const status = checkSubscriptionStatus();
  return status.isActive;
}

/**
 * Get days remaining in trial or subscription
 * @returns {number} Days remaining
 */
function getDaysRemaining() {
  const status = checkSubscriptionStatus();
  return status.daysRemaining;
}

/**
 * Format price with currency
 * @param {number} amount - Amount
 * @returns {string} Formatted price
 */
function formatPrice(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

// Subscription API
export const Subscription = {
  init,
  getPlans,
  getPlan,
  checkSubscriptionStatus,
  subscribe,
  renew,
  changePlan,
  cancel,
  getSubscriptionDetails,
  canAccessFeatures,
  getDaysRemaining,
  formatPrice,
  TRIAL_DURATION_DAYS,
  PLANS
};

export default Subscription;
