/**
 * Notifications Module
 * Toast/alert notification system
 */

import { createElement, addClass, removeClass } from './ui.js';

// Toast container
let container = null;
const toasts = [];
const MAX_TOASTS = 3;
const AUTO_DISMISS = 4000;

/**
 * Initialize notification system
 */
function init() {
  if (container) return;

  container = createElement('div', {
    className: 'toast-container',
    style: {
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: '500',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '400px'
    }
  });

  document.body.appendChild(container);
}

/**
 * Create toast element
 * @param {string} type - Toast type
 * @param {string} message - Toast message
 * @returns {HTMLElement} Toast element
 */
function createToast(type, message) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const colors = {
    success: '#00D68F',
    error: '#FF4D6D',
    warning: '#FFB74D',
    info: '#4D9FFF'
  };

  const toast = createElement('div', {
    className: `toast toast-${type}`,
    style: {
      background: '#1C1C28',
      border: '1px solid #2A2A3A',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'toastSlideIn 0.3s ease-out',
      position: 'relative',
      overflow: 'hidden'
    }
  }, [
    // Icon
    createElement('span', {
      style: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: `${colors[type]}20`,
        color: colors[type],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        flexShrink: '0'
      }
    }, icons[type]),

    // Message
    createElement('span', {
      style: {
        flex: '1',
        color: '#F0F0F5',
        fontSize: '14px',
        lineHeight: '1.5'
      }
    }, message),

    // Close button
    createElement('button', {
      className: 'toast-close',
      style: {
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8888AA',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        fontSize: '18px',
        flexShrink: '0'
      },
      onclick: () => dismiss(toast)
    }, '×'),

    // Progress bar
    createElement('div', {
      className: 'toast-progress',
      style: {
        position: 'absolute',
        bottom: '0',
        left: '0',
        height: '3px',
        background: colors[type],
        width: '100%',
        animation: `progress ${AUTO_DISMISS}ms linear forwards`
      }
    })
  ]);

  // Add progress animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes toastSlideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);

  return toast;
}

/**
 * Show toast notification
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {string} message - Toast message
 */
function show(type, message) {
  init();

  // Remove oldest toast if at limit
  if (toasts.length >= MAX_TOASTS) {
    const oldest = toasts.shift();
    dismiss(oldest);
  }

  // Create and show new toast
  const toast = createToast(type, message);
  container.appendChild(toast);
  toasts.push(toast);

  // Auto dismiss
  const timeoutId = setTimeout(() => dismiss(toast), AUTO_DISMISS);
  toast.dataset.timeoutId = timeoutId;
}

/**
 * Dismiss toast
 * @param {HTMLElement} toast - Toast to dismiss
 */
function dismiss(toast) {
  if (!toast || !toast.parentNode) return;

  // Clear timeout
  if (toast.dataset.timeoutId) {
    clearTimeout(parseInt(toast.dataset.timeoutId));
  }

  // Remove from array
  const index = toasts.indexOf(toast);
  if (index > -1) {
    toasts.splice(index, 1);
  }

  // Animate out
  toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
  toast.addEventListener('animationend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, { once: true });
}

/**
 * Show success toast
 * @param {string} message - Toast message
 */
function success(message) {
  show('success', message);
}

/**
 * Show error toast
 * @param {string} message - Toast message
 */
function error(message) {
  show('error', message);
}

/**
 * Show warning toast
 * @param {string} message - Toast message
 */
function warning(message) {
  show('warning', message);
}

/**
 * Show info toast
 * @param {string} message - Toast message
 */
function info(message) {
  show('info', message);
}

/**
 * Clear all toasts
 */
function clear() {
  [...toasts].forEach(toast => dismiss(toast));
}

// Notification API
export const Notify = {
  init,
  show,
  dismiss,
  success,
  error,
  warning,
  info,
  clear
};

export default Notify;
