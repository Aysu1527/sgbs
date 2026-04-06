/**
 * State Module
 * Central app state manager with reactive pattern
 */

import { Storage } from './storage.js';
import { deepClone } from './utils.js';

// Internal state storage
const _data = {};
const _listeners = {};
const _storageKeys = {};

/**
 * Initialize state with storage keys mapping
 * @param {Object} storageMapping - { stateKey: storageKey }
 */
function init(storageMapping = {}) {
  Object.assign(_storageKeys, storageMapping);

  // Load initial data from storage
  Object.entries(storageMapping).forEach(([stateKey, storageKey]) => {
    const stored = Storage.get(storageKey);
    if (stored !== null) {
      _data[stateKey] = deepClone(stored);
    }
  });
}

/**
 * Get state value
 * @param {string} key - State key
 * @returns {any} State value
 */
function get(key) {
  return deepClone(_data[key]);
}

/**
 * Set state value
 * @param {string} key - State key
 * @param {any} value - Value to set
 * @param {boolean} persist - Whether to persist to storage
 */
function set(key, value, persist = true) {
  const oldValue = _data[key];
  _data[key] = deepClone(value);

  // Persist to storage if configured
  if (persist && _storageKeys[key]) {
    Storage.set(_storageKeys[key], value);
  }

  // Notify listeners
  notify(key, value, oldValue);
}

/**
 * Update state partially (for objects)
 * @param {string} key - State key
 * @param {Object} partial - Partial update
 * @param {boolean} persist - Whether to persist
 */
function update(key, partial, persist = true) {
  const current = _data[key] || {};
  const updated = { ...current, ...partial };
  set(key, updated, persist);
}

/**
 * Subscribe to state changes
 * @param {string} key - State key
 * @param {Function} callback - Callback(newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
function subscribe(key, callback) {
  if (!_listeners[key]) {
    _listeners[key] = [];
  }

  _listeners[key].push(callback);

  // Return unsubscribe function
  return () => {
    const index = _listeners[key].indexOf(callback);
    if (index > -1) {
      _listeners[key].splice(index, 1);
    }
  };
}

/**
 * Unsubscribe from state changes
 * @param {string} key - State key
 * @param {Function} callback - Callback to remove
 */
function unsubscribe(key, callback) {
  if (!_listeners[key]) return;

  const index = _listeners[key].indexOf(callback);
  if (index > -1) {
    _listeners[key].splice(index, 1);
  }
}

/**
 * Notify listeners of state change
 * @param {string} key - State key
 * @param {any} newValue - New value
 * @param {any} oldValue - Old value
 */
function notify(key, newValue, oldValue) {
  if (!_listeners[key]) return;

  _listeners[key].forEach(callback => {
    try {
      callback(deepClone(newValue), deepClone(oldValue));
    } catch (error) {
      console.error(`State listener error for "${key}":`, error);
    }
  });
}

/**
 * Get all state keys
 * @returns {Array} State keys
 */
function keys() {
  return Object.keys(_data);
}

/**
 * Reset state to initial values
 * @param {Object} initialValues - Initial values
 */
function reset(initialValues = {}) {
  Object.keys(_data).forEach(key => {
    delete _data[key];
  });

  Object.entries(initialValues).forEach(([key, value]) => {
    set(key, value);
  });
}

/**
 * Clear all state
 */
function clear() {
  Object.keys(_data).forEach(key => {
    delete _data[key];
    delete _listeners[key];
  });
}

/**
 * Create computed state that depends on other states
 * @param {Array} deps - Dependency keys
 * @param {Function} compute - Compute function
 * @returns {Object} Computed with get and subscribe
 */
function computed(deps, compute) {
  const getValue = () => {
    const values = deps.map(dep => get(dep));
    return compute(...values);
  };

  return {
    get: getValue,
    subscribe: (callback) => {
      const unsubscribers = deps.map(dep => subscribe(dep, () => {
        callback(getValue());
      }));

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  };
}

/**
 * Batch multiple state updates
 * @param {Function} updater - Function that calls set/update
 */
function batch(updater) {
  const notifyQueue = [];

  // Temporarily override notify to queue notifications
  const originalNotify = notify;
  notify = (key, newValue, oldValue) => {
    notifyQueue.push({ key, newValue, oldValue });
  };

  try {
    updater();
  } finally {
    // Restore original notify
    notify = originalNotify;

    // Process notifications
    notifyQueue.forEach(({ key, newValue, oldValue }) => {
      notify(key, newValue, oldValue);
    });
  }
}

/**
 * Persist current state to storage
 */
function persist() {
  Object.entries(_storageKeys).forEach(([stateKey, storageKey]) => {
    if (_data[stateKey] !== undefined) {
      Storage.set(storageKey, _data[stateKey]);
    }
  });
}

/**
 * Load state from storage
 */
function load() {
  Object.entries(_storageKeys).forEach(([stateKey, storageKey]) => {
    const stored = Storage.get(storageKey);
    if (stored !== null) {
      _data[stateKey] = deepClone(stored);
    }
  });
}

// State API
export const State = {
  init,
  get,
  set,
  update,
  subscribe,
  unsubscribe,
  keys,
  reset,
  clear,
  computed,
  batch,
  persist,
  load
};

export default State;
