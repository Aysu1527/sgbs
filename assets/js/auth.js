/**
 * Auth Module
 * User account management and authentication
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { generateId } from './utils.js';
import { Notify } from './notifications.js';

const STORAGE_KEYS = {
  USERS: 'et_users',
  CURRENT_USER: 'et_current_user',
  SESSION: 'et_session'
};

// Default admin/user for demo
const DEFAULT_USERS = [];

/**
 * Initialize auth system
 */
function init() {
  const users = Storage.get(STORAGE_KEYS.USERS) || [];
  if (users.length === 0) {
    Storage.set(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  // Check for existing session
  const session = Storage.get(STORAGE_KEYS.SESSION);
  if (session && session.isLoggedIn) {
    const user = getUserById(session.userId);
    if (user) {
      State.set('currentUser', user, false);
      State.set('isLoggedIn', true, false);
    }
  }
}

/**
 * Get all users
 * @returns {Array} All users
 */
function getAllUsers() {
  return Storage.get(STORAGE_KEYS.USERS) || [];
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User object or null
 */
function getUserById(userId) {
  const users = getAllUsers();
  return users.find(u => u.id === userId) || null;
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object|null} User object or null
 */
function getUserByEmail(email) {
  const users = getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Object} Result { success, user, error }
 */
function register(userData) {
  const { name, email, password } = userData;

  // Validation
  if (!name || name.trim().length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' };
  }

  if (!email || !isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Check if email already exists
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Create user
  const user = {
    id: generateId('user'),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password), // Simple hash for demo
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trialStartDate: new Date().toISOString(),
    subscription: {
      status: 'trial', // trial, active, expired
      plan: null, // monthly, halfyearly, yearly
      startDate: null,
      endDate: null,
      paymentHistory: []
    }
  };

  // Save user
  const users = getAllUsers();
  users.push(user);
  Storage.set(STORAGE_KEYS.USERS, users);

  // Auto login after registration
  login(email, password);

  Notify.success('Account created successfully! Your 1-month free trial has started.');

  return { success: true, user, error: null };
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Result { success, user, error }
 */
function login(email, password) {
  const user = getUserByEmail(email);

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (user.password !== hashPassword(password)) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Create session
  const session = {
    userId: user.id,
    isLoggedIn: true,
    loginTime: new Date().toISOString()
  };

  Storage.set(STORAGE_KEYS.SESSION, session);
  Storage.set(STORAGE_KEYS.CURRENT_USER, user);

  State.set('currentUser', user, false);
  State.set('isLoggedIn', true, false);

  Notify.success(`Welcome back, ${user.name}!`);

  return { success: true, user, error: null };
}

/**
 * Logout user
 */
function logout() {
  Storage.remove(STORAGE_KEYS.SESSION);
  Storage.remove(STORAGE_KEYS.CURRENT_USER);

  State.set('currentUser', null, false);
  State.set('isLoggedIn', false, false);

  Notify.success('Logged out successfully');
}

/**
 * Check if user is logged in
 * @returns {boolean} True if logged in
 */
function isLoggedIn() {
  return State.get('isLoggedIn') || false;
}

/**
 * Get current user
 * @returns {Object|null} Current user or null
 */
function getCurrentUser() {
  return State.get('currentUser') || null;
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Result { success, user, error }
 */
function updateProfile(userId, updates) {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  // Update allowed fields
  const allowedFields = ['name', 'email'];
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      users[index][field] = updates[field];
    }
  });

  users[index].updatedAt = new Date().toISOString();

  Storage.set(STORAGE_KEYS.USERS, users);

  // Update current user if it's the same user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    State.set('currentUser', users[index], false);
    Storage.set(STORAGE_KEYS.CURRENT_USER, users[index]);
  }

  return { success: true, user: users[index], error: null };
}

/**
 * Change password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Result { success, error }
 */
function changePassword(userId, currentPassword, newPassword) {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  if (users[index].password !== hashPassword(currentPassword)) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  users[index].password = hashPassword(newPassword);
  users[index].updatedAt = new Date().toISOString();

  Storage.set(STORAGE_KEYS.USERS, users);

  return { success: true, error: null };
}

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Simple password hash (for demo purposes)
 * In production, use proper hashing like bcrypt
 * @param {string} password - Password to hash
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  // Simple hash for demo - NOT for production use
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

/**
 * Delete user account
 * @param {string} userId - User ID
 * @param {string} password - Confirmation password
 * @returns {Object} Result { success, error }
 */
function deleteAccount(userId, password) {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  if (users[index].password !== hashPassword(password)) {
    return { success: false, error: 'Password is incorrect' };
  }

  // Remove user
  users.splice(index, 1);
  Storage.set(STORAGE_KEYS.USERS, users);

  // Clear session
  logout();

  return { success: true, error: null };
}

// Auth API
export const Auth = {
  init,
  register,
  login,
  logout,
  isLoggedIn,
  getCurrentUser,
  getUserById,
  getUserByEmail,
  updateProfile,
  changePassword,
  deleteAccount,
  isValidEmail,
  STORAGE_KEYS
};

export default Auth;
