/**
 * Export Module
 * Export to CSV & JSON
 */

import { formatDate, formatCurrency, downloadFile } from './utils.js';

/**
 * Convert transactions to CSV
 * @param {Array} transactions - Transactions to export
 * @param {Array} categories - Categories for lookup
 * @param {Object} settings - App settings
 * @returns {string} CSV content
 */
function toCSV(transactions, categories = [], settings = {}) {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Tags', 'Created At'];

  const rows = transactions.map(txn => {
    const category = categories.find(c => c.id === txn.category);
    const categoryName = category ? category.name : txn.category;

    return [
      formatDate(txn.date, settings.dateFormat || 'YYYY-MM-DD'),
      txn.type,
      categoryName,
      txn.description,
      txn.amount,
      (txn.tags || []).join(', '),
      formatDate(txn.createdAt, 'YYYY-MM-DD HH:mm:ss')
    ];
  });

  // Escape CSV values
  const escapeCSV = (value) => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Convert transactions to JSON
 * @param {Array} transactions - Transactions to export
 * @param {Array} categories - Categories to export
 * @param {Object} budgets - Budgets to export
 * @param {Object} settings - Settings to export
 * @returns {string} JSON content
 */
function toJSON(transactions, categories, budgets, settings) {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    transactions,
    categories,
    budgets,
    settings
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export transactions as CSV file
 * @param {Array} transactions - Transactions to export
 * @param {Array} categories - Categories for lookup
 * @param {Object} settings - App settings
 * @param {string} filename - Output filename
 */
function exportCSV(transactions, categories, settings, filename = 'expenses.csv') {
  const csv = toCSV(transactions, categories, settings);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export all data as JSON file
 * @param {Array} transactions - Transactions to export
 * @param {Array} categories - Categories to export
 * @param {Object} budgets - Budgets to export
 * @param {Object} settings - Settings to export
 * @param {string} filename - Output filename
 */
function exportJSON(transactions, categories, budgets, settings, filename = 'expense-tracker-backup.json') {
  const json = toJSON(transactions, categories, budgets, settings);
  downloadFile(json, filename, 'application/json');
}

/**
 * Import data from JSON
 * @param {string} jsonContent - JSON string to import
 * @returns {Object} Parsed data
 */
function importFromJSON(jsonContent) {
  try {
    const data = JSON.parse(jsonContent);

    // Validate structure
    if (!data.transactions || !Array.isArray(data.transactions)) {
      throw new Error('Invalid data: transactions array missing');
    }

    return {
      transactions: data.transactions || [],
      categories: data.categories || [],
      budgets: data.budgets || {},
      settings: data.settings || {}
    };
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`);
  }
}

/**
 * Parse CSV content
 * @param {string} csvContent - CSV string to parse
 * @returns {Array} Parsed transactions
 */
function importFromCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = parseCSVLine(lines[0]);
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
    });

    // Map to transaction structure
    const transaction = {
      id: `txn_${Date.now()}_${i}`,
      date: parseDate(row.date),
      type: row.type === 'income' ? 'income' : 'expense',
      category: row.category,
      description: row.description,
      amount: parseFloat(row.amount) || 0,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (transaction.amount > 0) {
      transactions.push(transaction);
    }
  }

  return transactions;
}

/**
 * Parse CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Parsed values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse date from various formats
 * @param {string} dateStr - Date string
 * @returns {string} ISO date string
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Try various formats
  const formats = [
    // YYYY-MM-DD
    (str) => {
      const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
    },
    // MM/DD/YYYY
    (str) => {
      const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : null;
    },
    // DD/MM/YYYY
    (str) => {
      const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null;
    }
  ];

  for (const format of formats) {
    const result = format(dateStr);
    if (result) return result;
  }

  // Fallback to parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Generate monthly summary report
 * @param {Array} transactions - All transactions
 * @returns {Array} Monthly summary
 */
function generateMonthlyReport(transactions) {
  const monthly = {};

  transactions.forEach(txn => {
    const date = new Date(txn.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthly[key]) {
      monthly[key] = {
        month: key,
        income: 0,
        expense: 0,
        count: 0
      };
    }

    monthly[key].count++;
    if (txn.type === 'income') {
      monthly[key].income += txn.amount;
    } else {
      monthly[key].expense += txn.amount;
    }
  });

  return Object.values(monthly)
    .map(m => ({
      ...m,
      net: m.income - m.expense
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Generate category breakdown report
 * @param {Array} transactions - Transactions
 * @param {Array} categories - Categories
 * @returns {Array} Category breakdown
 */
function generateCategoryReport(transactions, categories) {
  const breakdown = {};

  transactions.forEach(txn => {
    if (!breakdown[txn.category]) {
      const category = categories.find(c => c.id === txn.category);
      breakdown[txn.category] = {
        categoryId: txn.category,
        categoryName: category ? category.name : txn.category,
        icon: category ? category.icon : '📦',
        color: category ? category.color : '#78909C',
        amount: 0,
        count: 0
      };
    }

    breakdown[txn.category].amount += txn.amount;
    breakdown[txn.category].count++;
  });

  return Object.values(breakdown).sort((a, b) => b.amount - a.amount);
}

// Export API
export const Export = {
  toCSV,
  toJSON,
  exportCSV,
  exportJSON,
  importFromJSON,
  importFromCSV,
  generateMonthlyReport,
  generateCategoryReport
};

export default Export;
