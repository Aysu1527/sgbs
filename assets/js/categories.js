/**
 * Categories Module
 * Category management logic
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { generateId, deepClone } from './utils.js';
import { validateCategoryObject } from './validators.js';
import { Notify } from './notifications.js';

const STORAGE_KEY = Storage.KEYS.CATEGORIES;

/**
 * Initialize categories from storage or defaults
 */
async function init() {
  let categories = Storage.get(STORAGE_KEY);

  if (!categories || categories.length === 0) {
    // Load default categories
    try {
      const response = await fetch('data/default-categories.json');
      const defaults = await response.json();
      categories = defaults;
      Storage.set(STORAGE_KEY, categories);
    } catch (error) {
      console.error('Failed to load default categories:', error);
      categories = [];
    }
  }

  State.set('categories', categories, false);
}

/**
 * Get all categories
 * @returns {Array} All categories
 */
function getAll() {
  return State.get('categories') || [];
}

/**
 * Get category by ID
 * @param {string} id - Category ID
 * @returns {Object|null} Category or null
 */
function getById(id) {
  const categories = getAll();
  return categories.find(c => c.id === id) || null;
}

/**
 * Get categories by type
 * @param {string} type - Category type ('income' or 'expense')
 * @returns {Array} Filtered categories
 */
function getByType(type) {
  const categories = getAll();
  return categories.filter(c => c.type === type);
}

/**
 * Create new category
 * @param {Object} data - Category data
 * @returns {Object} Result { success, category, error }
 */
function create(data) {
  const categories = getAll();

  // Validate
  const validation = validateCategoryObject(data, categories);
  if (!validation.valid) {
    return { success: false, category: null, error: validation.errors };
  }

  // Create category
  const category = {
    id: generateId('cat'),
    name: data.name.trim(),
    icon: data.icon,
    color: data.color,
    type: data.type || 'expense',
    budgetLimit: data.budgetLimit || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save
  const updated = [...categories, category];
  State.set('categories', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success(`Category "${category.name}" created`);

  return { success: true, category, error: null };
}

/**
 * Update category
 * @param {string} id - Category ID
 * @param {Object} data - Update data
 * @returns {Object} Result { success, category, error }
 */
function update(id, data) {
  const categories = getAll();
  const index = categories.findIndex(c => c.id === id);

  if (index === -1) {
    return { success: false, category: null, error: { general: 'Category not found' } };
  }

  // Validate
  const validation = validateCategoryObject(data, categories, id);
  if (!validation.valid) {
    return { success: false, category: null, error: validation.errors };
  }

  // Update
  const updated = [...categories];
  updated[index] = {
    ...updated[index],
    ...data,
    updatedAt: new Date().toISOString()
  };

  State.set('categories', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success(`Category "${updated[index].name}" updated`);

  return { success: true, category: updated[index], error: null };
}

/**
 * Delete category
 * @param {string} id - Category ID
 * @returns {Object} Result { success, error }
 */
function remove(id) {
  const categories = getAll();
  const category = categories.find(c => c.id === id);

  if (!category) {
    return { success: false, error: 'Category not found' };
  }

  // Check if category is in use
  const transactions = State.get('transactions') || [];
  const inUse = transactions.some(t => t.category === id);

  if (inUse) {
    return { success: false, error: 'Cannot delete category that has transactions' };
  }

  const updated = categories.filter(c => c.id !== id);
  State.set('categories', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success(`Category "${category.name}" deleted`);

  return { success: true, error: null };
}

/**
 * Get category spending for a period
 * @param {string} categoryId - Category ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Total spending
 */
function getSpending(categoryId, startDate, endDate) {
  const transactions = State.get('transactions') || [];

  return transactions
    .filter(t => {
      if (t.category !== categoryId) return false;
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Get category statistics
 * @param {string} categoryId - Category ID
 * @returns {Object} Statistics
 */
function getStats(categoryId) {
  const transactions = State.get('transactions') || [];
  const category = getById(categoryId);

  const categoryTransactions = transactions.filter(t => t.category === categoryId);
  const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  const count = categoryTransactions.length;
  const average = count > 0 ? total / count : 0;

  // This month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthSpending = categoryTransactions
    .filter(t => new Date(t.date) >= thisMonthStart)
    .reduce((sum, t) => sum + t.amount, 0);

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthSpending = categoryTransactions
    .filter(t => {
      const date = new Date(t.date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    total,
    count,
    average,
    thisMonth: thisMonthSpending,
    lastMonth: lastMonthSpending,
    budgetLimit: category?.budgetLimit || 0,
    budgetUsed: category?.budgetLimit ? (thisMonthSpending / category.budgetLimit) * 100 : 0
  };
}

/**
 * Get available icons
 * @returns {Array} Icon list
 */
function getIcons() {
  return [
    '🛒', '🚗', '🏠', '🏥', '🎮', '💡', '🛍️', '📚',
    '💼', '💻', '📈', '📦', '🍔', '🎬', '✈️', '🎁',
    '🏋️', '🐾', '🌱', '🔧', '🎨', '🎵', '📱', '💊',
    '☕', '🍕', '🏖️', '👕', '💄', '🧹', '📺', '🚲'
  ];
}

/**
 * Get available colors
 * @returns {Array} Color list
 */
function getColors() {
  return [
    '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800',
    '#00BCD4', '#E91E63', '#3F51B5', '#00D68F', '#00BFA5',
    '#FFB74D', '#78909C', '#8BC34A', '#03A9F4', '#673AB7',
    '#FF5722', '#795548', '#607D8B', '#9E9E9E', '#000000'
  ];
}

// Categories API
export const Categories = {
  init,
  getAll,
  getById,
  getByType,
  create,
  update,
  remove,
  getSpending,
  getStats,
  getIcons,
  getColors
};

export default Categories;
