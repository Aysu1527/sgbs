/**
 * Transactions Module
 * CRUD logic for transactions
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { generateId, formatDate, deepClone } from './utils.js';
import { validateTransaction } from './validators.js';
import { Notify } from './notifications.js';

const STORAGE_KEY = Storage.KEYS.TRANSACTIONS;

/**
 * Initialize transactions
 */
function init() {
  const transactions = Storage.get(STORAGE_KEY) || [];
  State.set('transactions', transactions, false);
}

/**
 * Get all transactions
 * @returns {Array} All transactions
 */
function getAll() {
  return State.get('transactions') || [];
}

/**
 * Get transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Object|null} Transaction or null
 */
function getById(id) {
  const transactions = getAll();
  return transactions.find(t => t.id === id) || null;
}

/**
 * Get transactions by category
 * @param {string} categoryId - Category ID
 * @returns {Array} Filtered transactions
 */
function getByCategory(categoryId) {
  const transactions = getAll();
  return transactions.filter(t => t.category === categoryId);
}

/**
 * Get recent transactions
 * @param {number} limit - Number of transactions
 * @returns {Array} Recent transactions
 */
function getRecent(limit = 5) {
  const transactions = getAll();
  return transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/**
 * Create new transaction
 * @param {Object} data - Transaction data
 * @returns {Object} Result { success, transaction, error }
 */
function create(data) {
  const transactions = getAll();
  const categories = State.get('categories') || [];

  // Validate
  const validation = validateTransaction(data, categories);
  if (!validation.valid) {
    return { success: false, transaction: null, error: validation.errors };
  }

  // Create transaction
  const transaction = {
    id: generateId('txn'),
    type: data.type,
    amount: parseFloat(data.amount),
    category: data.category,
    description: data.description.trim(),
    date: data.date,
    paymentMethod: data.paymentMethod || 'cash',
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save
  const updated = [...transactions, transaction];
  State.set('transactions', updated);
  Storage.set(STORAGE_KEY, updated);

  const typeLabel = transaction.type === 'income' ? 'Income' : 'Expense';
  Notify.success(`${typeLabel} added successfully`);

  return { success: true, transaction, error: null };
}

/**
 * Update transaction
 * @param {string} id - Transaction ID
 * @param {Object} data - Update data
 * @returns {Object} Result { success, transaction, error }
 */
function update(id, data) {
  const transactions = getAll();
  const index = transactions.findIndex(t => t.id === id);

  if (index === -1) {
    return { success: false, transaction: null, error: { general: 'Transaction not found' } };
  }

  const categories = State.get('categories') || [];

  // Validate
  const validation = validateTransaction(data, categories);
  if (!validation.valid) {
    return { success: false, transaction: null, error: validation.errors };
  }

  // Update
  const updated = [...transactions];
  updated[index] = {
    ...updated[index],
    type: data.type,
    amount: parseFloat(data.amount),
    category: data.category,
    description: data.description.trim(),
    date: data.date,
    paymentMethod: data.paymentMethod || updated[index].paymentMethod || 'cash',
    tags: data.tags || [],
    updatedAt: new Date().toISOString()
  };

  State.set('transactions', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success('Transaction updated successfully');

  return { success: true, transaction: updated[index], error: null };
}

/**
 * Delete transaction
 * @param {string} id - Transaction ID
 * @returns {Object} Result { success, error }
 */
function remove(id) {
  const transactions = getAll();
  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return { success: false, error: 'Transaction not found' };
  }

  const updated = transactions.filter(t => t.id !== id);
  State.set('transactions', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success('Transaction deleted');

  return { success: true, error: null };
}

/**
 * Delete multiple transactions
 * @param {Array} ids - Transaction IDs
 * @returns {Object} Result { success, count, error }
 */
function removeMany(ids) {
  const transactions = getAll();
  const updated = transactions.filter(t => !ids.includes(t.id));
  const count = transactions.length - updated.length;

  State.set('transactions', updated);
  Storage.set(STORAGE_KEY, updated);

  Notify.success(`${count} transactions deleted`);

  return { success: true, count, error: null };
}

/**
 * Get dashboard summary
 * @returns {Object} Summary data
 */
function getSummary() {
  const transactions = getAll();
  const settings = State.get('settings') || {};
  const startOfMonth = settings.startOfMonth || 1;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), startOfMonth);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, startOfMonth - 1);

  let totalIncome = 0;
  let totalExpense = 0;
  let thisMonthIncome = 0;
  let thisMonthExpense = 0;

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }

    const date = new Date(t.date);
    if (date >= monthStart && date <= monthEnd) {
      if (t.type === 'income') {
        thisMonthIncome += t.amount;
      } else {
        thisMonthExpense += t.amount;
      }
    }
  });

  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalMonthExpense) / totalIncome) * 100 : 0;

  return {
    balance,
    totalIncome,
    totalExpense,
    thisMonthIncome,
    thisMonthExpense,
    savingsRate: Math.max(0, savingsRate),
    transactionCount: transactions.length
  };
}

/**
 * Get spending by category for a period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Spending by category
 */
function getSpendingByCategory(startDate, endDate) {
  const transactions = getAll();
  const categories = State.get('categories') || [];

  const spending = {};

  transactions.forEach(t => {
    if (t.type !== 'expense') return;

    const date = new Date(t.date);
    if (date < startDate || date > endDate) return;

    if (!spending[t.category]) {
      const category = categories.find(c => c.id === t.category);
      spending[t.category] = {
        categoryId: t.category,
        name: category?.name || 'Unknown',
        icon: category?.icon || '📦',
        color: category?.color || '#78909C',
        amount: 0,
        count: 0
      };
    }

    spending[t.category].amount += t.amount;
    spending[t.category].count++;
  });

  return Object.values(spending).sort((a, b) => b.amount - a.amount);
}

/**
 * Get monthly data for charts
 * @param {number} months - Number of months
 * @returns {Array} Monthly data
 */
function getMonthlyData(months = 6) {
  const transactions = getAll();
  const data = [];

  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;

      if (tMonthKey === monthKey) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    data.push({
      month: monthName,
      fullMonth: monthKey,
      income,
      expense,
      net: income - expense
    });
  }

  return data;
}

/**
 * Get daily spending for current month
 * @returns {Array} Daily spending data
 */
function getDailySpending() {
  const transactions = getAll();
  const settings = State.get('settings') || {};
  const startOfMonth = settings.startOfMonth || 1;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), startOfMonth);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const data = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    if (date > now) break;

    let amount = 0;

    transactions.forEach(t => {
      if (t.type !== 'expense') return;

      const tDate = new Date(t.date);
      if (tDate.toDateString() === date.toDateString()) {
        amount += t.amount;
      }
    });

    data.push({
      day,
      date: date.toISOString().split('T')[0],
      amount
    });
  }

  return data;
}

/**
 * Generate demo data
 * @returns {Array} Generated transactions
 */
function generateDemoData() {
  const categories = State.get('categories') || [];
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const transactions = [];
  const now = new Date();

  // Generate for last 3 months
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

    // Add salary income on 1st of month
    if (incomeCategories.length > 0) {
      const salaryCat = incomeCategories.find(c => c.id === 'cat_salary') || incomeCategories[0];
      transactions.push({
        id: generateId('txn'),
        type: 'income',
        amount: 3000 + Math.random() * 500,
        category: salaryCat.id,
        description: 'Monthly Salary',
        date: new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0],
        tags: ['salary', 'income'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Add random expenses throughout the month
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const numExpenses = 15 + Math.floor(Math.random() * 10);

    for (let i = 0; i < numExpenses; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];

      let amount;
      switch (category.id) {
        case 'cat_housing': amount = 1000 + Math.random() * 500; break;
        case 'cat_food': amount = 20 + Math.random() * 80; break;
        case 'cat_transport': amount = 10 + Math.random() * 40; break;
        case 'cat_utilities': amount = 50 + Math.random() * 100; break;
        case 'cat_shopping': amount = 30 + Math.random() * 150; break;
        default: amount = 10 + Math.random() * 50;
      }

      transactions.push({
        id: generateId('txn'),
        type: 'expense',
        amount: Math.round(amount * 100) / 100,
        category: category.id,
        description: `${category.name} expense`,
        date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().split('T')[0],
        tags: ['demo'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Save demo data
  State.set('transactions', transactions);
  Storage.set(STORAGE_KEY, transactions);

  // Set budget
  const budgets = {
    monthly: 3000,
    categories: {
      cat_food: 500,
      cat_transport: 200,
      cat_housing: 1500,
      cat_entertainment: 100,
      cat_utilities: 200,
      cat_shopping: 300
    },
    alerts: {
      enabled: true,
      threshold: 80
    }
  };
  Storage.set(Storage.KEYS.BUDGETS, budgets);
  State.set('budgets', budgets, false);

  Notify.success('Demo data loaded successfully');

  return transactions;
}

// Transactions API
export const Transactions = {
  init,
  getAll,
  getById,
  getByCategory,
  getRecent,
  create,
  update,
  remove,
  removeMany,
  getSummary,
  getSpendingByCategory,
  getMonthlyData,
  getDailySpending,
  generateDemoData
};

export default Transactions;
