/**
 * UI Module
 * DOM manipulation helpers
 */

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element
 * @returns {HTMLElement|null} Found element
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query selector all shorthand
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element
 * @returns {NodeList} Found elements
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Create element with attributes and children
 * @param {string} tag - Element tag
 * @param {Object} attrs - Attributes
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  });

  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        el.appendChild(child);
      }
    });
  }

  return el;
}

/**
 * Toggle element visibility
 * @param {HTMLElement} el - Element to toggle
 * @param {boolean} show - Show or hide
 */
export function toggle(el, show) {
  if (el) {
    el.style.display = show ? '' : 'none';
  }
}

/**
 * Show element
 * @param {HTMLElement} el - Element to show
 */
export function show(el) {
  if (el) {
    el.style.display = '';
    el.hidden = false;
  }
}

/**
 * Hide element
 * @param {HTMLElement} el - Element to hide
 */
export function hide(el) {
  if (el) {
    el.style.display = 'none';
    el.hidden = true;
  }
}

/**
 * Add class to element
 * @param {HTMLElement} el - Target element
 * @param {string} className - Class to add
 */
export function addClass(el, className) {
  if (el) {
    el.classList.add(className);
  }
}

/**
 * Remove class from element
 * @param {HTMLElement} el - Target element
 * @param {string} className - Class to remove
 */
export function removeClass(el, className) {
  if (el) {
    el.classList.remove(className);
  }
}

/**
 * Toggle class on element
 * @param {HTMLElement} el - Target element
 * @param {string} className - Class to toggle
 * @param {boolean} force - Force add or remove
 */
export function toggleClass(el, className, force) {
  if (el) {
    el.classList.toggle(className, force);
  }
}

/**
 * Check if element has class
 * @param {HTMLElement} el - Target element
 * @param {string} className - Class to check
 * @returns {boolean} True if has class
 */
export function hasClass(el, className) {
  return el ? el.classList.contains(className) : false;
}

/**
 * Set text content
 * @param {HTMLElement} el - Target element
 * @param {string} text - Text to set
 */
export function setText(el, text) {
  if (el) {
    el.textContent = text;
  }
}

/**
 * Set HTML content
 * @param {HTMLElement} el - Target element
 * @param {string} html - HTML to set
 */
export function setHTML(el, html) {
  if (el) {
    el.innerHTML = html;
  }
}

/**
 * Empty element
 * @param {HTMLElement} el - Element to empty
 */
export function empty(el) {
  if (el) {
    el.innerHTML = '';
  }
}

/**
 * Append child to element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element
 */
export function append(parent, child) {
  if (parent && child) {
    parent.appendChild(child);
  }
}

/**
 * Prepend child to element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element
 */
export function prepend(parent, child) {
  if (parent && child) {
    parent.insertBefore(child, parent.firstChild);
  }
}

/**
 * Remove element from DOM
 * @param {HTMLElement} el - Element to remove
 */
export function remove(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Add event listener with auto-cleanup
 * @param {HTMLElement} el - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 * @returns {Function} Cleanup function
 */
export function on(el, event, handler, options = {}) {
  if (el) {
    el.addEventListener(event, handler, options);
    return () => el.removeEventListener(event, handler, options);
  }
  return () => {};
}

/**
 * Delegate event listener
 * @param {HTMLElement} parent - Parent element
 * @param {string} selector - Child selector
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
export function delegate(parent, selector, event, handler) {
  if (parent) {
    parent.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e, target);
      }
    });
  }
}

/**
 * Get form data as object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data
 */
export function getFormData(form) {
  const data = {};
  const elements = form.querySelectorAll('input, select, textarea');

  elements.forEach(el => {
    const name = el.name || el.dataset.name;
    if (!name) return;

    if (el.type === 'checkbox') {
      data[name] = el.checked;
    } else if (el.type === 'number') {
      data[name] = el.value === '' ? null : parseFloat(el.value);
    } else if (el.type === 'radio') {
      if (el.checked) {
        data[name] = el.value;
      }
    } else {
      data[name] = el.value;
    }
  });

  return data;
}

/**
 * Set form data from object
 * @param {HTMLFormElement} form - Form element
 * @param {Object} data - Data to set
 */
export function setFormData(form, data) {
  Object.entries(data).forEach(([name, value]) => {
    const el = form.querySelector(`[name="${name}"], [data-name="${name}"]`);
    if (!el) return;

    if (el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else if (el.type === 'radio') {
      const radio = form.querySelector(`[name="${name}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      el.value = value ?? '';
    }
  });
}

/**
 * Clear form
 * @param {HTMLFormElement} form - Form element
 */
export function clearForm(form) {
  form.reset();
  const errors = form.querySelectorAll('.form-error');
  errors.forEach(err => {
    err.textContent = '';
    err.style.display = 'none';
  });
  const inputs = form.querySelectorAll('.form-input, .form-select, .form-textarea');
  inputs.forEach(input => {
    input.classList.remove('error');
  });
}

/**
 * Focus element
 * @param {HTMLElement} el - Element to focus
 */
export function focus(el) {
  if (el) {
    el.focus();
  }
}

/**
 * Blur element
 * @param {HTMLElement} el - Element to blur
 */
export function blur(el) {
  if (el) {
    el.blur();
  }
}

/**
 * Scroll to element
 * @param {HTMLElement} el - Element to scroll to
 * @param {Object} options - Scroll options
 */
export function scrollTo(el, options = {}) {
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', ...options });
  }
}

/**
 * Get element position
 * @param {HTMLElement} el - Target element
 * @returns {Object} Position { top, left, width, height }
 */
export function getPosition(el) {
  if (!el) return { top: 0, left: 0, width: 0, height: 0 };
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Set CSS custom property
 * @param {string} name - Property name
 * @param {string} value - Property value
 * @param {HTMLElement} el - Target element (default: root)
 */
export function setCSSProperty(name, value, el = document.documentElement) {
  el.style.setProperty(name, value);
}

/**
 * Get CSS custom property
 * @param {string} name - Property name
 * @param {HTMLElement} el - Target element (default: root)
 * @returns {string} Property value
 */
export function getCSSProperty(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Animate element
 * @param {HTMLElement} el - Element to animate
 * @param {string} animation - Animation name
 * @param {number} duration - Duration in ms
 * @returns {Promise} Animation promise
 */
export function animate(el, animation, duration = 300) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    el.style.animation = `${animation} ${duration}ms ease`;
    el.addEventListener('animationend', () => {
      el.style.animation = '';
      resolve();
    }, { once: true });
  });
}

/**
 * Wait for element to be ready
 * @param {string} selector - Element selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<HTMLElement>} Element promise
 */
export function waitFor(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = $(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = $(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

// UI API
export const UI = {
  $,
  $$,
  createElement,
  toggle,
  show,
  hide,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setText,
  setHTML,
  empty,
  append,
  prepend,
  remove,
  on,
  delegate,
  getFormData,
  setFormData,
  clearForm,
  focus,
  blur,
  scrollTo,
  getPosition,
  setCSSProperty,
  getCSSProperty,
  animate,
  waitFor
};

export default UI;
