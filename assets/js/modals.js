/**
 * Modals Module
 * Modal open/close/form handling
 */

import { createElement, $, on, addClass, removeClass, clearForm, getFormData } from './ui.js';

// Active modals stack
const activeModals = [];

/**
 * Create modal backdrop
 * @returns {HTMLElement} Backdrop element
 */
function createBackdrop() {
  const backdrop = createElement('div', {
    className: 'modal-backdrop',
    style: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: '300',
      opacity: '0',
      visibility: 'hidden',
      transition: 'opacity 0.25s ease, visibility 0.25s ease'
    }
  });

  backdrop.addEventListener('click', () => {
    if (activeModals.length > 0) {
      close(activeModals[activeModals.length - 1]);
    }
  });

  return backdrop;
}

/**
 * Create base modal structure
 * @param {Object} options - Modal options
 * @returns {Object} Modal elements
 */
function createModal(options = {}) {
  const {
    title = '',
    size = 'md',
    closable = true,
    onClose = null
  } = options;

  const sizeClasses = {
    sm: '400px',
    md: '560px',
    lg: '720px',
    xl: '960px'
  };

  const backdrop = createBackdrop();
  document.body.appendChild(backdrop);

  const modal = createElement('div', {
    className: `modal modal-${size}`,
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(0.95)',
      width: '90%',
      maxWidth: sizeClasses[size] || sizeClasses.md,
      maxHeight: '90vh',
      background: '#111118',
      border: '1px solid #2A2A3A',
      borderRadius: '28px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      zIndex: '400',
      opacity: '0',
      visibility: 'hidden',
      transition: 'opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease',
      display: 'flex',
      flexDirection: 'column'
    }
  });

  // Header
  const header = createElement('div', {
    className: 'modal-header',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px',
      borderBottom: '1px solid #2A2A3A'
    }
  }, [
    createElement('h3', {
      className: 'modal-title',
      style: {
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontSize: '20px',
        color: '#F0F0F5',
        margin: '0'
      }
    }, title),
    closable ? createElement('button', {
      className: 'modal-close',
      style: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        color: '#8888AA',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px'
      },
      onclick: () => close(modal)
    }, '×') : null
  ]);

  // Body
  const body = createElement('div', {
    className: 'modal-body',
    style: {
      flex: '1',
      padding: '24px',
      overflowY: 'auto'
    }
  });

  // Footer
  const footer = createElement('div', {
    className: 'modal-footer',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '16px 24px',
      borderTop: '1px solid #2A2A3A'
    }
  });

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  document.body.appendChild(modal);

  // Store modal data
  modal._backdrop = backdrop;
  modal._onClose = onClose;
  modal._options = options;

  // Keyboard handler
  const keyHandler = (e) => {
    if (e.key === 'Escape' && closable) {
      close(modal);
    }
  };
  document.addEventListener('keydown', keyHandler);
  modal._keyHandler = keyHandler;

  return { modal, header, body, footer, backdrop };
}

/**
 * Open modal
 * @param {HTMLElement} modal - Modal element
 */
function open(modal) {
  if (!modal) return;

  activeModals.push(modal);

  // Show backdrop
  modal._backdrop.style.opacity = '1';
  modal._backdrop.style.visibility = 'visible';

  // Show modal
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
  modal.style.transform = 'translate(-50%, -50%) scale(1)';

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Focus first input
  setTimeout(() => {
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Close modal
 * @param {HTMLElement} modal - Modal element
 */
function close(modal) {
  if (!modal || !modal.parentNode) return;

  const index = activeModals.indexOf(modal);
  if (index > -1) {
    activeModals.splice(index, 1);
  }

  // Hide modal
  modal.style.opacity = '0';
  modal.style.visibility = 'hidden';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';

  // Hide backdrop
  modal._backdrop.style.opacity = '0';
  modal._backdrop.style.visibility = 'hidden';

  // Call onClose callback
  if (modal._onClose) {
    modal._onClose();
  }

  // Cleanup after animation
  setTimeout(() => {
    document.removeEventListener('keydown', modal._keyHandler);
    if (modal._backdrop.parentNode) {
      modal._backdrop.parentNode.removeChild(modal._backdrop);
    }
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }

    // Restore body scroll if no more modals
    if (activeModals.length === 0) {
      document.body.style.overflow = '';
    }
  }, 250);
}

/**
 * Close all modals
 */
function closeAll() {
  [...activeModals].forEach(modal => close(modal));
}

/**
 * Create confirmation modal
 * @param {Object} options - Confirmation options
 * @returns {Promise<boolean>} User choice
 */
function confirm(options = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  } = options;

  return new Promise((resolve) => {
    const { modal, body, footer } = createModal({
      title,
      size: 'sm',
      onClose: () => resolve(false)
    });

    // Icon
    const icons = {
      warning: '⚠',
      danger: '✕',
      info: 'ℹ'
    };

    const colors = {
      warning: '#FFB74D',
      danger: '#FF4D6D',
      info: '#4D9FFF'
    };

    // Content
    body.appendChild(createElement('div', {
      style: {
        textAlign: 'center',
        padding: '24px'
      }
    }, [
      createElement('div', {
        style: {
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: `${colors[type]}20`,
          color: colors[type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px'
        }
      }, icons[type]),
      createElement('p', {
        style: {
          color: '#F0F0F5',
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '0'
        }
      }, message)
    ]));

    // Buttons
    footer.appendChild(createElement('button', {
      className: 'btn btn-secondary',
      style: {
        padding: '12px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#F0F0F5',
        background: '#1C1C28',
        border: '1px solid #2A2A3A',
        cursor: 'pointer'
      },
      onclick: () => {
        close(modal);
        resolve(false);
      }
    }, cancelText));

    footer.appendChild(createElement('button', {
      className: 'btn btn-primary',
      style: {
        padding: '12px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#0A0A0F',
        background: colors[type],
        border: 'none',
        cursor: 'pointer'
      },
      onclick: () => {
        close(modal);
        resolve(true);
      }
    }, confirmText));

    open(modal);
  });
}

/**
 * Create alert modal
 * @param {Object} options - Alert options
 * @returns {Promise<void>} Resolves when dismissed
 */
function alert(options = {}) {
  const {
    title = 'Alert',
    message = '',
    buttonText = 'OK'
  } = options;

  return new Promise((resolve) => {
    const { modal, body, footer } = createModal({
      title,
      size: 'sm',
      onClose: resolve
    });

    body.appendChild(createElement('p', {
      style: {
        color: '#F0F0F5',
        fontSize: '16px',
        lineHeight: '1.5',
        margin: '0'
      }
    }, message));

    footer.appendChild(createElement('button', {
      className: 'btn btn-primary',
      style: {
        padding: '12px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#0A0A0F',
        background: '#00D68F',
        border: 'none',
        cursor: 'pointer'
      },
      onclick: () => {
        close(modal);
        resolve();
      }
    }, buttonText));

    open(modal);
  });
}

// Modal API
export const Modal = {
  create: createModal,
  open,
  close,
  closeAll,
  confirm,
  alert
};

export default Modal;
