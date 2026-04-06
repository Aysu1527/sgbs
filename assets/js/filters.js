/**
 * Filters Module
 * Search, filter, sort logic
 */

import { debounce } from './utils.js';

/**
 * Filter transactions by search term
 * @param {Array} transactions - Transactions array
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered transactions
 */
function filterBySearch(transactions, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return transactions;
  }

  const term = searchTerm.toLowerCase().trim();

  return transactions.filter(txn => {
    const description = (txn.description || '').toLowerCase();
    const category = (txn.categoryName || '').toLowerCase();
    const tags = (txn.tags || []).join(' ').toLowerCase();
    const amount = String(txn.amount).toLowerCase();

    return description.includes(term) ||
           category.includes(term) ||
           tags.includes(term) ||
           amount.includes(term);
  });
}

/**
 * Filter transactions by date range
 * @param {Array} transactions - Transactions array
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered transactions
 */
function filterByDateRange(transactions, startDate, endDate) {
  if (!startDate && !endDate) {
    return transactions;
  }

  return transactions.filter(txn => {
    const txnDate = new Date(txn.date);

    if (startDate) {
      const start = new Date(startDate);
      if (txnDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (txnDate > end) return false;
    }

    return true;
  });
}

/**
 * Filter transactions by categories
 * @param {Array} transactions - Transactions array
 * @param {Array} categoryIds - Category IDs to include
 * @returns {Array} Filtered transactions
 */
function filterByCategories(transactions, categoryIds) {
  if (!categoryIds || categoryIds.length === 0) {
    return transactions;
  }

  return transactions.filter(txn => categoryIds.includes(txn.category));
}

/**
 * Filter transactions by type
 * @param {Array} transactions - Transactions array
 * @param {string} type - Type filter ('all', 'income', 'expense')
 * @returns {Array} Filtered transactions
 */
function filterByType(transactions, type) {
  if (!type || type === 'all') {
    return transactions;
  }

  return transactions.filter(txn => txn.type === type);
}

/**
 * Filter transactions by payment method
 * @param {Array} transactions - Transactions array
 * @param {string} paymentMethod - Payment method filter ('all' or specific method)
 * @returns {Array} Filtered transactions
 */
function filterByPaymentMethod(transactions, paymentMethod) {
  if (!paymentMethod || paymentMethod === 'all') {
    return transactions;
  }

  return transactions.filter(txn => (txn.paymentMethod || 'cash') === paymentMethod);
}

/**
 * Filter transactions by amount range
 * @param {Array} transactions - Transactions array
 * @param {number} minAmount - Minimum amount
 * @param {number} maxAmount - Maximum amount
 * @returns {Array} Filtered transactions
 */
function filterByAmountRange(transactions, minAmount, maxAmount) {
  return transactions.filter(txn => {
    if (minAmount !== null && minAmount !== undefined && txn.amount < minAmount) {
      return false;
    }
    if (maxAmount !== null && maxAmount !== undefined && txn.amount > maxAmount) {
      return false;
    }
    return true;
  });
}

/**
 * Filter transactions by tags
 * @param {Array} transactions - Transactions array
 * @param {Array} tags - Tags to filter by
 * @returns {Array} Filtered transactions
 */
function filterByTags(transactions, tags) {
  if (!tags || tags.length === 0) {
    return transactions;
  }

  return transactions.filter(txn => {
    const txnTags = txn.tags || [];
    return tags.some(tag => txnTags.includes(tag));
  });
}

/**
 * Apply all filters
 * @param {Array} transactions - Transactions array
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered transactions
 */
function applyFilters(transactions, filters = {}) {
  let result = [...transactions];

  if (filters.search) {
    result = filterBySearch(result, filters.search);
  }

  if (filters.startDate || filters.endDate) {
    result = filterByDateRange(result, filters.startDate, filters.endDate);
  }

  if (filters.categories && filters.categories.length > 0) {
    result = filterByCategories(result, filters.categories);
  }

  if (filters.type && filters.type !== 'all') {
    result = filterByType(result, filters.type);
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    result = filterByAmountRange(result, filters.minAmount, filters.maxAmount);
  }

  if (filters.tags && filters.tags.length > 0) {
    result = filterByTags(result, filters.tags);
  }

  return result;
}

/**
 * Sort transactions
 * @param {Array} transactions - Transactions array
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted transactions
 */
function sortTransactions(transactions, sortBy = 'date', sortOrder = 'desc') {
  const sorted = [...transactions].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle dates
    if (sortBy === 'date' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle strings (case insensitive)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    // Handle null/undefined
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Paginate transactions
 * @param {Array} transactions - Transactions array
 * @param {number} page - Current page (1-based)
 * @param {number} perPage - Items per page
 * @returns {Object} Paginated result
 */
function paginate(transactions, page = 1, perPage = 10) {
  const total = transactions.length;
  const totalPages = Math.ceil(total / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const data = transactions.slice(start, end);

  return {
    data,
    total,
    page: currentPage,
    perPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

/**
 * Extract unique tags from transactions
 * @param {Array} transactions - Transactions array
 * @returns {Array} Unique tags
 */
function getUniqueTags(transactions) {
  const tags = new Set();
  transactions.forEach(txn => {
    (txn.tags || []).forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Get filter summary text
 * @param {Object} filters - Active filters
 * @returns {string} Summary text
 */
function getFilterSummary(filters) {
  const parts = [];

  if (filters.search) {
    parts.push(`search: "${filters.search}"`);
  }

  if (filters.startDate || filters.endDate) {
    const start = filters.startDate || '...';
    const end = filters.endDate || '...';
    parts.push(`date: ${start} to ${end}`);
  }

  if (filters.categories && filters.categories.length > 0) {
    parts.push(`${filters.categories.length} categories`);
  }

  if (filters.type && filters.type !== 'all') {
    parts.push(`type: ${filters.type}`);
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const min = filters.minAmount ?? '0';
    const max = filters.maxAmount ?? '∞';
    parts.push(`amount: ${min} - ${max}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No filters';
}

/**
 * Create debounced search handler
 * @param {Function} callback - Search callback
 * @param {number} delay - Debounce delay
 * @returns {Function} Debounced handler
 */
function createSearchHandler(callback, delay = 300) {
  return debounce((searchTerm) => {
    callback(searchTerm);
  }, delay);
}

/**
 * Reset filters to default
 * @returns {Object} Default filters
 */
function getDefaultFilters() {
  return {
    search: '',
    startDate: null,
    endDate: null,
    categories: [],
    type: 'all',
    paymentMethod: 'all',
    minAmount: null,
    maxAmount: null,
    tags: [],
    sortBy: 'date',
    sortOrder: 'desc'
  };
}

// Filters API
export const Filters = {
  filterBySearch,
  filterByDateRange,
  filterByCategories,
  filterByType,
  filterByPaymentMethod,
  filterByAmountRange,
  filterByTags,
  applyFilters,
  sortTransactions,
  paginate,
  getUniqueTags,
  getFilterSummary,
  createSearchHandler,
  getDefaultFilters
};

export default Filters;
