/**
 * Budget Module
 * Budget rules & threshold logic
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { getStartOfMonth, getEndOfMonth, calculatePercentage } from './utils.js';
import { Notify } from './notifications.js';

const STORAGE_KEY = Storage.KEYS.BUDGETS;

// Default budget structure
const DEFAULT_BUDGETS = {
  monthly: 3000,
  categories: {},
  alerts: {
    enabled: true,
    threshold: 80
  }
};

/**
 * Initialize budgets
 */
function init() {
  let budgets = Storage.get(STORAGE_KEY);

  if (!budgets) {
    budgets = deepClone(DEFAULT_BUDGETS);
    Storage.set(STORAGE_KEY, budgets);
  }

  State.set('budgets', budgets, false);
}

/**
 * Get all budgets
 * @returns {Object} Budgets object
 */
function getAll() {
  return State.get('budgets') || deepClone(DEFAULT_BUDGETS);
}

/**
 * Get monthly budget
 * @returns {number} Monthly budget
 */
function getMonthlyBudget() {
  const budgets = getAll();
  return budgets.monthly || 0;
}

/**
 * Set monthly budget
 * @param {number} amount - Budget amount
 */
function setMonthlyBudget(amount) {
  const budgets = getAll();
  budgets.monthly = Math.max(0, parseFloat(amount) || 0);
  budgets.updatedAt = new Date().toISOString();

  State.set('budgets', budgets);
  Storage.set(STORAGE_KEY, budgets);

  Notify.success('Monthly budget updated');
}

/**
 * Get category budget
 * @param {string} categoryId - Category ID
 * @returns {number} Category budget
 */
function getCategoryBudget(categoryId) {
  const budgets = getAll();
  return budgets.categories[categoryId] || 0;
}

/**
 * Set category budget
 * @param {string} categoryId - Category ID
 * @param {number} amount - Budget amount
 */
function setCategoryBudget(categoryId, amount) {
  const budgets = getAll();

  if (!budgets.categories) {
    budgets.categories = {};
  }

  budgets.categories[categoryId] = Math.max(0, parseFloat(amount) || 0);
  budgets.updatedAt = new Date().toISOString();

  State.set('budgets', budgets);
  Storage.set(STORAGE_KEY, budgets);
}

/**
 * Remove category budget
 * @param {string} categoryId - Category ID
 */
function removeCategoryBudget(categoryId) {
  const budgets = getAll();

  if (budgets.categories) {
    delete budgets.categories[categoryId];
    budgets.updatedAt = new Date().toISOString();

    State.set('budgets', budgets);
    Storage.set(STORAGE_KEY, budgets);
  }
}

/**
 * Get alert settings
 * @returns {Object} Alert settings
 */
function getAlertSettings() {
  const budgets = getAll();
  return budgets.alerts || { enabled: true, threshold: 80 };
}

/**
 * Set alert settings
 * @param {Object} settings - Alert settings
 */
function setAlertSettings(settings) {
  const budgets = getAll();
  budgets.alerts = {
    ...budgets.alerts,
    ...settings
  };
  budgets.updatedAt = new Date().toISOString();

  State.set('budgets', budgets);
  Storage.set(STORAGE_KEY, budgets);
}

/**
 * Get current month spending
 * @returns {Object} Spending data
 */
function getCurrentMonthSpending() {
  const transactions = State.get('transactions') || [];
  const settings = State.get('settings') || {};
  const startOfMonth = settings.startOfMonth || 1;

  const now = new Date();
  const monthStart = getStartOfMonth(now, startOfMonth);
  const monthEnd = getEndOfMonth(now, startOfMonth);

  let totalExpense = 0;
  let totalIncome = 0;
  const byCategory = {};

  transactions.forEach(t => {
    const date = new Date(t.date);
    if (date >= monthStart && date <= monthEnd) {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      } else {
        totalIncome += t.amount;
      }
    }
  });

  return {
    expense: totalExpense,
    income: totalIncome,
    net: totalIncome - totalExpense,
    byCategory,
    monthStart,
    monthEnd
  };
}

/**
 * Check budget alerts
 * @returns {Array} Alert messages
 */
function checkAlerts() {
  const alerts = [];
  const budgets = getAll();
  const alertSettings = getAlertSettings();

  if (!alertSettings.enabled) return alerts;

  const spending = getCurrentMonthSpending();
  const threshold = alertSettings.threshold || 80;

  // Check overall budget
  const monthlyBudget = getMonthlyBudget();
  if (monthlyBudget > 0) {
    const usedPercent = calculatePercentage(spending.expense, monthlyBudget);
    if (usedPercent >= threshold) {
      const remaining = monthlyBudget - spending.expense;
      alerts.push({
        type: usedPercent >= 100 ? 'danger' : 'warning',
        title: 'Monthly Budget Alert',
        message: `You've used ${usedPercent}% of your monthly budget. $${remaining.toFixed(2)} remaining.`,
        percent: usedPercent
      });
    }
  }

  // Check category budgets
  const categories = State.get('categories') || [];
  Object.entries(budgets.categories || {}).forEach(([categoryId, budget]) => {
    if (budget > 0) {
      const spent = spending.byCategory[categoryId] || 0;
      const usedPercent = calculatePercentage(spent, budget);

      if (usedPercent >= threshold) {
        const category = categories.find(c => c.id === categoryId);
        const categoryName = category ? category.name : categoryId;
        const remaining = budget - spent;

        alerts.push({
          type: usedPercent >= 100 ? 'danger' : 'warning',
          title: `${categoryName} Budget Alert`,
          message: `You've used ${usedPercent}% of your ${categoryName} budget. $${remaining.toFixed(2)} remaining.`,
          percent: usedPercent,
          categoryId
        });
      }
    }
  });

  return alerts;
}

/**
 * Show budget alerts as notifications
 */
function showAlertNotifications() {
  const alerts = checkAlerts();

  alerts.forEach(alert => {
    if (alert.type === 'danger') {
      Notify.error(alert.message);
    } else {
      Notify.warning(alert.message);
    }
  });
}

/**
 * Get budget progress for all categories
 * @returns {Array} Progress data
 */
function getBudgetProgress() {
  const budgets = getAll();
  const spending = getCurrentMonthSpending();
  const categories = State.get('categories') || [];

  const progress = [];

  // Add categories with budgets
  Object.entries(budgets.categories || {}).forEach(([categoryId, budget]) => {
    const category = categories.find(c => c.id === categoryId);
    if (category && budget > 0) {
      const spent = spending.byCategory[categoryId] || 0;
      const percent = calculatePercentage(spent, budget);

      progress.push({
        categoryId,
        categoryName: category.name,
        icon: category.icon,
        color: category.color,
        budget,
        spent,
        remaining: Math.max(0, budget - spent),
        percent,
        status: percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'safe'
      });
    }
  });

  // Sort by percent descending
  return progress.sort((a, b) => b.percent - a.percent);
}

/**
 * Deep clone helper
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Budget API
export const Budget = {
  init,
  getAll,
  getMonthlyBudget,
  setMonthlyBudget,
  getCategoryBudget,
  setCategoryBudget,
  removeCategoryBudget,
  getAlertSettings,
  setAlertSettings,
  getCurrentMonthSpending,
  checkAlerts,
  showAlertNotifications,
  getBudgetProgress
};

export default Budget;
