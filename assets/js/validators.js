/**
 * Validation Functions
 * Form validation logic
 */

/**
 * Validate amount field
 * @param {*} value - Value to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export function validateAmount(value) {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: 'Amount is required' };
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (num > 9999999999) {
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  // Check decimal places (max 2)
  const decimalStr = value.toString().split('.')[1];
  if (decimalStr && decimalStr.length > 2) {
    return { valid: false, error: 'Amount can have maximum 2 decimal places' };
  }

  return { valid: true, error: null };
}

/**
 * Validate description field
 * @param {string} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateDescription(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Description is required' };
  }

  const trimmed = value.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Description must be at least 3 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Description must be less than 100 characters' };
  }

  return { valid: true, error: null };
}

/**
 * Validate date field
 * @param {string} value - Date string to validate
 * @param {boolean} allowFuture - Whether to allow future dates
 * @returns {Object} Validation result
 */
export function validateDate(value, allowFuture = false) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Date is required' };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (!allowFuture) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      return { valid: false, error: 'Date cannot be in the future' };
    }
  }

  // Check if date is too old (more than 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (date < tenYearsAgo) {
    return { valid: false, error: 'Date is too old' };
  }

  return { valid: true, error: null };
}

/**
 * Validate category field
 * @param {string} value - Category ID to validate
 * @param {Array} categories - Available categories
 * @returns {Object} Validation result
 */
export function validateCategory(value, categories = []) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Category is required' };
  }

  const category = categories.find(cat => cat.id === value);
  if (!category) {
    return { valid: false, error: 'Please select a valid category' };
  }

  return { valid: true, error: null };
}

/**
 * Validate budget amount
 * @param {*} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateBudget(value) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, error: null }; // Budget is optional
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Budget must be a number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Budget cannot be negative' };
  }

  if (num > 9999999) {
    return { valid: false, error: 'Budget exceeds maximum limit' };
  }

  return { valid: true, error: null };
}

/**
 * Validate tags
 * @param {Array} tags - Tags array to validate
 * @returns {Object} Validation result
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }

  if (tags.length > 10) {
    return { valid: false, error: 'Maximum 10 tags allowed' };
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { valid: false, error: 'All tags must be strings' };
    }

    if (tag.length > 20) {
      return { valid: false, error: 'Each tag must be less than 20 characters' };
    }

    if (!/^[a-zA-Z0-9\s-_]+$/.test(tag)) {
      return { valid: false, error: 'Tags can only contain letters, numbers, spaces, hyphens and underscores' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate category name
 * @param {string} value - Name to validate
 * @param {Array} existingCategories - Existing categories to check for duplicates
 * @param {string} excludeId - Category ID to exclude from duplicate check
 * @returns {Object} Validation result
 */
export function validateCategoryName(value, existingCategories = [], excludeId = null) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Category name is required' };
  }

  const trimmed = value.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Category name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Category name must be less than 50 characters' };
  }

  // Check for duplicates
  const duplicate = existingCategories.find(
    cat => cat.name.toLowerCase() === trimmed.toLowerCase() && cat.id !== excludeId
  );
  if (duplicate) {
    return { valid: false, error: 'A category with this name already exists' };
  }

  return { valid: true, error: null };
}

/**
 * Validate hex color
 * @param {string} value - Hex color to validate
 * @returns {Object} Validation result
 */
export function validateColor(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Color is required' };
  }

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(value)) {
    return { valid: false, error: 'Invalid color format. Use hex (e.g., #4CAF50)' };
  }

  return { valid: true, error: null };
}

/**
 * Validate icon (emoji)
 * @param {string} value - Icon to validate
 * @returns {Object} Validation result
 */
export function validateIcon(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Icon is required' };
  }

  // Basic emoji validation - check if it's a single character or common emoji
  const trimmed = value.trim();
  if (trimmed.length > 2) {
    return { valid: false, error: 'Please select a single emoji' };
  }

  return { valid: true, error: null };
}

/**
 * Validate payment method
 * @param {string} value - Payment method to validate
 * @returns {Object} Validation result
 */
export function validatePaymentMethod(value) {
  const validMethods = ['cash', 'paytm', 'phonepe', 'gpay', 'amazonpay', 'bhim', 'other_upi', 'card', 'netbanking'];
  
  if (!value || value.trim() === '') {
    return { valid: true, error: null }; // Payment method is optional, defaults to cash
  }

  if (!validMethods.includes(value)) {
    return { valid: false, error: 'Invalid payment method' };
  }

  return { valid: true, error: null };
}

/**
 * Validate email
 * @param {string} value - Email to validate
 * @returns {Object} Validation result
 */
export function validateEmail(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, error: null };
}

/**
 * Validate file import
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
export function validateFile(file, allowedTypes = ['application/json'], maxSize = 5 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: 'Please select a file' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` };
  }

  return { valid: true, error: null };
}

/**
 * Validate transaction object
 * @param {Object} transaction - Transaction to validate
 * @param {Array} categories - Available categories
 * @returns {Object} Validation result with all errors
 */
export function validateTransaction(transaction, categories = []) {
  const errors = {};

  const amountValidation = validateAmount(transaction.amount);
  if (!amountValidation.valid) {
    errors.amount = amountValidation.error;
  }

  const descriptionValidation = validateDescription(transaction.description);
  if (!descriptionValidation.valid) {
    errors.description = descriptionValidation.error;
  }

  const paymentMethodValidation = validatePaymentMethod(transaction.paymentMethod);
  if (!paymentMethodValidation.valid) {
    errors.paymentMethod = paymentMethodValidation.error;
  }

  const dateValidation = validateDate(transaction.date);
  if (!dateValidation.valid) {
    errors.date = dateValidation.error;
  }

  const categoryValidation = validateCategory(transaction.category, categories);
  if (!categoryValidation.valid) {
    errors.category = categoryValidation.error;
  }

  if (transaction.tags) {
    const tagsValidation = validateTags(transaction.tags);
    if (!tagsValidation.valid) {
      errors.tags = tagsValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate category object
 * @param {Object} category - Category to validate
 * @param {Array} existingCategories - Existing categories
 * @param {string} excludeId - Category ID to exclude
 * @returns {Object} Validation result
 */
export function validateCategoryObject(category, existingCategories = [], excludeId = null) {
  const errors = {};

  const nameValidation = validateCategoryName(category.name, existingCategories, excludeId);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error;
  }

  const colorValidation = validateColor(category.color);
  if (!colorValidation.valid) {
    errors.color = colorValidation.error;
  }

  const iconValidation = validateIcon(category.icon);
  if (!iconValidation.valid) {
    errors.icon = iconValidation.error;
  }

  if (category.budgetLimit !== undefined && category.budgetLimit !== null) {
    const budgetValidation = validateBudget(category.budgetLimit);
    if (!budgetValidation.valid) {
      errors.budgetLimit = budgetValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Clear validation errors from form
 * @param {HTMLElement} form - Form element
 */
export function clearValidationErrors(form) {
  const inputs = form.querySelectorAll('.form-input, .form-select, .form-textarea');
  inputs.forEach(input => {
    input.classList.remove('error');
  });

  const errors = form.querySelectorAll('.form-error');
  errors.forEach(error => {
    error.textContent = '';
    error.style.display = 'none';
  });
}

/**
 * Display validation error on input
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message
 */
export function showValidationError(input, message) {
  input.classList.add('error');

  const formGroup = input.closest('.form-group');
  if (formGroup) {
    let errorEl = formGroup.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      formGroup.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Display all validation errors
 * @param {HTMLElement} form - Form element
 * @param {Object} errors - Errors object { field: message }
 */
export function showValidationErrors(form, errors) {
  clearValidationErrors(form);

  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"], [data-field="${field}"]`);
    if (input) {
      showValidationError(input, message);
    }
  });
}
