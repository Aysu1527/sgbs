/**
 * Storage Module
 * JSON read/write via localStorage
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'et_transactions',
  CATEGORIES: 'et_categories',
  BUDGETS: 'et_budgets',
  SETTINGS: 'et_settings'
};

/**
 * Get item from localStorage
 * @param {string} key - Storage key
 * @returns {any} Parsed value or null
 */
function get(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Storage get error for key "${key}":`, error);
    return null;
  }
}

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Storage set error for key "${key}":`, error);
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please export and clear some data.');
    }
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Storage remove error for key "${key}":`, error);
  }
}

/**
 * Clear all localStorage
 */
function clear() {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Storage clear error:', error);
  }
}

/**
 * Get all storage keys with prefix
 * @param {string} prefix - Key prefix
 * @returns {Array} Matching keys
 */
function getKeysWithPrefix(prefix) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Get storage usage info
 * @returns {Object} Usage statistics
 */
function getUsage() {
  let totalSize = 0;
  const items = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      totalSize += size;
      items[key] = {
        size,
        sizeFormatted: formatBytes(size)
      };
    }
  }

  return {
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    itemCount: localStorage.length,
    items
  };
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Export all data as object
 * @returns {Object} All stored data
 */
function exportAll() {
  const data = {};
  Object.values(STORAGE_KEYS).forEach(key => {
    data[key] = get(key);
  });
  return data;
}

/**
 * Import data from object
 * @param {Object} data - Data to import
 * @param {boolean} merge - Whether to merge or replace
 */
function importAll(data, merge = false) {
  Object.entries(data).forEach(([key, value]) => {
    if (merge && Array.isArray(value)) {
      const existing = get(key) || [];
      // Merge arrays, avoiding duplicates by ID
      const merged = [...existing];
      value.forEach(item => {
        const index = merged.findIndex(e => e.id === item.id);
        if (index >= 0) {
          merged[index] = item;
        } else {
          merged.push(item);
        }
      });
      set(key, merged);
    } else if (merge && typeof value === 'object' && value !== null) {
      const existing = get(key) || {};
      set(key, { ...existing, ...value });
    } else {
      set(key, value);
    }
  });
}

/**
 * Check if storage is available
 * @returns {boolean} True if localStorage is available
 */
function isAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize storage with defaults
 * @param {Object} defaults - Default values
 */
function initDefaults(defaults) {
  Object.entries(defaults).forEach(([key, value]) => {
    if (get(key) === null) {
      set(key, value);
    }
  });
}

// Storage API
export const Storage = {
  KEYS: STORAGE_KEYS,
  get,
  set,
  remove,
  clear,
  getKeysWithPrefix,
  getUsage,
  exportAll,
  importAll,
  isAvailable,
  initDefaults
};

// Legacy compatibility
export default Storage;
