/**
 * App Entry Point
 * Main application initialization and routing with Auth & Subscription
 */

import { Storage } from './storage.js';
import { State } from './state.js';
import { UI, $, $$, on, createElement, show, hide, addClass, removeClass, empty } from './ui.js';
import { Notify } from './notifications.js';
import { Modal } from './modals.js';
import { formatCurrency, formatDate, countUp, generateId, debounce } from './utils.js';
import { validateTransaction, showValidationErrors, clearValidationErrors } from './validators.js';
import { Filters } from './filters.js';
import { Export } from './export.js';
import { Categories } from './categories.js';
import { Budget } from './budget.js';
import { Transactions } from './transactions.js';
import { Charts } from './charts.js';
import { Auth } from './auth.js';
import { Subscription, PLANS } from './subscription.js';

// App state
let currentRoute = '';
let transactionFilters = Filters.getDefaultFilters();
let editingTransactionId = null;
let selectedTransactions = new Set();

// DOM Elements
let sidebar, main, header, content;

/**
 * Initialize application
 */
async function init() {
  // 1. Check storage availability
  if (!Storage.isAvailable()) {
    alert('Local storage is not available. The app requires localStorage to function.');
    return;
  }

  // 2. Initialize state with storage mapping
  State.init({
    transactions: Storage.KEYS.TRANSACTIONS,
    categories: Storage.KEYS.CATEGORIES,
    budgets: Storage.KEYS.BUDGETS,
    settings: Storage.KEYS.SETTINGS
  });

  // 3. Initialize default settings
  initSettings();

  // 4. Initialize auth system
  Auth.init();

  // 5. Initialize subscription system
  Subscription.init();

  // 6. Check authentication - show auth modal if not logged in
  if (!Auth.isLoggedIn()) {
    showAuthModal();
    return;
  }

  // 7. Check subscription status
  const subStatus = Subscription.checkSubscriptionStatus();
  if (!subStatus.isActive) {
    showSubscriptionModal();
    return;
  }

  // 8. Initialize categories
  await Categories.init();

  // 9. Initialize transactions
  Transactions.init();

  // 10. Initialize budgets
  Budget.init();

  // 11. Initialize theme
  initTheme();

  // 12. Initialize router
  initRouter();

  // 13. Initialize charts
  Charts.init();

  // 14. Initialize notifications
  Notify.init();

  // 15. Check budget alerts
  setTimeout(() => {
    Budget.showAlertNotifications();
  }, 1000);

  // 16. Show trial/subscription banner if needed
  showSubscriptionBanner();

  // 17. Cache DOM elements
  sidebar = $('.sidebar');
  main = $('.main');
  header = $('.header');
  content = $('.content');

  // 18. Setup event listeners
  setupEventListeners();

  // 19. Render initial route
  Router.resolve();

  console.log('Expense Tracker initialized');
}

/**
 * Show subscription banner for trial or expiring subscription
 */
function showSubscriptionBanner() {
  const subDetails = Subscription.getSubscriptionDetails();
  if (!subDetails) return;

  const banner = $('.trial-banner');
  if (!banner) return;

  if (subDetails.isTrial && subDetails.daysRemaining <= 7) {
    banner.style.display = 'block';
    banner.innerHTML = `
      Your free trial ends in ${subDetails.daysRemaining} days. 
      <a href="#" onclick="window.showSubscriptionModal(); return false;">Upgrade now</a>
    `;
  } else if (subDetails.daysRemaining <= 7 && !subDetails.isTrial) {
    banner.style.display = 'block';
    banner.innerHTML = `
      Your subscription expires in ${subDetails.daysRemaining} days. 
      <a href="#" onclick="window.showSubscriptionModal(); return false;">Renew now</a>
    `;
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Show Auth Modal (Login/Register)
 */
function showAuthModal() {
  const { modal, body, footer } = Modal.create({
    title: '',
    size: 'md',
    closable: false
  });

  // Hide default header
  modal.querySelector('.modal-header').style.display = 'none';

  const authContainer = createElement('div', { className: 'auth-container' }, [
    createElement('div', { className: 'auth-logo' }, [
      createElement('div', { className: 'auth-logo-icon' }, '💰'),
      createElement('h1', { className: 'auth-title' }, 'Expense Tracker'),
      createElement('p', { className: 'auth-subtitle' }, 'Sign in to manage your finances')
    ]),

    createElement('div', { className: 'auth-tabs' }, [
      createElement('button', {
        className: 'auth-tab active',
        'data-tab': 'login',
        onclick: function() {
          switchAuthTab('login');
        }
      }, 'Login'),
      createElement('button', {
        className: 'auth-tab',
        'data-tab': 'register',
        onclick: function() {
          switchAuthTab('register');
        }
      }, 'Register')
    ]),

    // Login Form
    createElement('form', {
      className: 'auth-form',
      id: 'login-form',
      style: { display: 'block' }
    }, [
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Email'),
        createElement('input', {
          type: 'email',
          name: 'email',
          className: 'form-input',
          placeholder: 'your@email.com',
          required: true
        })
      ]),
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Password'),
        createElement('input', {
          type: 'password',
          name: 'password',
          className: 'form-input',
          placeholder: '••••••',
          required: true
        })
      ]),
      createElement('button', {
        type: 'button',
        className: 'btn btn-primary',
        style: { width: '100%' },
        onclick: handleLogin
      }, 'Sign In')
    ]),

    // Register Form
    createElement('form', {
      className: 'auth-form',
      id: 'register-form',
      style: { display: 'none' }
    }, [
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Full Name'),
        createElement('input', {
          type: 'text',
          name: 'name',
          className: 'form-input',
          placeholder: 'John Doe',
          required: true
        })
      ]),
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Email'),
        createElement('input', {
          type: 'email',
          name: 'email',
          className: 'form-input',
          placeholder: 'your@email.com',
          required: true
        })
      ]),
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Password'),
        createElement('input', {
          type: 'password',
          name: 'password',
          className: 'form-input',
          placeholder: 'Min 6 characters',
          required: true
        })
      ]),
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Confirm Password'),
        createElement('input', {
          type: 'password',
          name: 'confirmPassword',
          className: 'form-input',
          placeholder: '••••••',
          required: true
        })
      ]),
      createElement('p', {
        style: {
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginBottom: '16px'
        }
      }, '🎉 Start your 1-month FREE trial today! No credit card required.'),
      createElement('button', {
        type: 'button',
        className: 'btn btn-primary',
        style: { width: '100%' },
        onclick: handleRegister
      }, 'Create Account & Start Free Trial')
    ])
  ]);

  body.appendChild(authContainer);
  footer.style.display = 'none';

  Modal.open(modal);
}

/**
 * Switch between login and register tabs
 */
function switchAuthTab(tab) {
  $$('.auth-tab').forEach(t => removeClass(t, 'active'));
  $(`.auth-tab[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'login') {
    $('#login-form').style.display = 'block';
    $('#register-form').style.display = 'none';
  } else {
    $('#login-form').style.display = 'none';
    $('#register-form').style.display = 'block';
  }
}

/**
 * Handle login
 */
function handleLogin() {
  const form = $('#login-form');
  const email = form.querySelector('[name="email"]').value;
  const password = form.querySelector('[name="password"]').value;

  const result = Auth.login(email, password);

  if (result.success) {
    Modal.closeAll();
    // Check subscription status after login
    const subStatus = Subscription.checkSubscriptionStatus();
    if (!subStatus.isActive) {
      showSubscriptionModal();
    } else {
      location.reload();
    }
  } else {
    Notify.error(result.error);
  }
}

/**
 * Handle registration
 */
function handleRegister() {
  const form = $('#register-form');
  const name = form.querySelector('[name="name"]').value;
  const email = form.querySelector('[name="email"]').value;
  const password = form.querySelector('[name="password"]').value;
  const confirmPassword = form.querySelector('[name="confirmPassword"]').value;

  if (password !== confirmPassword) {
    Notify.error('Passwords do not match');
    return;
  }

  const result = Auth.register({ name, email, password });

  if (result.success) {
    Modal.closeAll();
    location.reload();
  } else {
    Notify.error(result.error);
  }
}

/**
 * Show Subscription/Pricing Modal
 */
function showSubscriptionModal() {
  const user = Auth.getCurrentUser();
  const subDetails = Subscription.getSubscriptionDetails();

  const { modal, body, footer } = Modal.create({
    title: 'Choose Your Plan',
    size: 'lg',
    closable: user ? true : false
  });

  // Trial info banner
  if (subDetails && subDetails.isTrial) {
    body.appendChild(createElement('div', {
      className: 'trial-info-banner',
      style: {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        textAlign: 'center'
      }
    }, [
      createElement('p', {
        style: { margin: '0', color: 'var(--text-primary)', fontSize: '16px' }
      }, `Your free trial ends in ${subDetails.daysRemaining} days`),
      createElement('p', {
        style: { margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }
      }, 'Upgrade now to continue using all features')
    ]));
  }

  // Expired message
  if (subDetails && subDetails.isExpired && !subDetails.isTrial) {
    body.appendChild(createElement('div', {
      style: {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--text-primary)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        textAlign: 'center'
      }
    }, [
      createElement('p', {
        style: { margin: '0', color: 'var(--text-primary)', fontSize: '16px' }
      }, 'Your subscription has expired'),
      createElement('p', {
        style: { margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }
      }, 'Renew now to regain access to all features')
    ]));
  }

  // Pricing cards
  const pricingGrid = createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px',
      marginBottom: '24px'
    }
  });

  Object.values(PLANS).forEach(plan => {
    const isCurrentPlan = subDetails?.plan === plan.id;

    const card = createElement('div', {
      className: `pricing-card ${plan.popular ? 'featured' : ''} ${isCurrentPlan ? 'current' : ''}`,
      style: isCurrentPlan ? { borderColor: 'var(--text-primary)', opacity: '0.8' } : {}
    }, [
      createElement('h3', { className: 'pricing-card-title' }, plan.name),
      createElement('div', { className: 'pricing-card-price' }, `₹${plan.price}`),
      createElement('div', { className: 'pricing-card-period' }, `for ${plan.period}`),
      plan.savings ? createElement('div', {
        style: {
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginBottom: '16px'
        }
      }, plan.savings) : null,
      createElement('ul', { className: 'pricing-card-features' },
        plan.features.map(f => createElement('li', {}, f))
      ),
      createElement('button', {
        className: `btn ${isCurrentPlan ? 'btn-secondary' : 'btn-primary'}`,
        style: { width: '100%' },
        onclick: () => handleSubscribe(plan.id),
        disabled: isCurrentPlan
      }, isCurrentPlan ? 'Current Plan' : 'Subscribe')
    ]);

    pricingGrid.appendChild(card);
  });

  body.appendChild(pricingGrid);

  // Payment form (initially hidden)
  const paymentForm = createElement('div', {
    id: 'payment-form',
    style: { display: 'none', marginTop: '24px' }
  }, [
    createElement('h4', {
      style: {
        marginBottom: '16px',
        color: 'var(--text-primary)',
        fontSize: '18px'
      }
    }, 'Payment Details'),
    createElement('div', { className: 'form-group' }, [
      createElement('label', { className: 'form-label' }, 'Card Number'),
      createElement('input', {
        type: 'text',
        name: 'cardNumber',
        className: 'form-input',
        placeholder: '1234 5678 9012 3456',
        maxlength: '19'
      })
    ]),
    createElement('div', {
      className: 'form-row',
      style: { gridTemplateColumns: '1fr 1fr' }
    }, [
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'Expiry Date'),
        createElement('input', {
          type: 'text',
          name: 'expiryDate',
          className: 'form-input',
          placeholder: 'MM/YY',
          maxlength: '5'
        })
      ]),
      createElement('div', { className: 'form-group' }, [
        createElement('label', { className: 'form-label' }, 'CVV'),
        createElement('input', {
          type: 'password',
          name: 'cvv',
          className: 'form-input',
          placeholder: '123',
          maxlength: '4'
        })
      ])
    ]),
    createElement('button', {
      className: 'btn btn-primary',
      style: { width: '100%', marginTop: '16px' },
      onclick: processPayment
    }, 'Complete Payment')
  ]);

  body.appendChild(paymentForm);

  footer.appendChild(createElement('button', {
    className: 'btn btn-secondary',
    onclick: () => {
      if (user && subDetails?.isActive) {
        Modal.close(modal);
      } else if (!user) {
        Modal.close(modal);
        showAuthModal();
      }
    }
  }, user && subDetails?.isActive ? 'Close' : 'Back'));

  Modal.open(modal);
}

let selectedPlanId = null;

/**
 * Handle subscribe button click
 */
function handleSubscribe(planId) {
  selectedPlanId = planId;
  const paymentForm = $('#payment-form');
  if (paymentForm) {
    paymentForm.style.display = 'block';
    paymentForm.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Process payment
 */
function processPayment() {
  const cardNumber = document.querySelector('[name="cardNumber"]').value;
  const expiryDate = document.querySelector('[name="expiryDate"]').value;
  const cvv = document.querySelector('[name="cvv"]').value;

  const user = Auth.getCurrentUser();
  if (!user) {
    Notify.error('Please log in first');
    return;
  }

  const result = Subscription.subscribe(user.id, selectedPlanId, {
    cardNumber,
    expiryDate,
    cvv
  });

  if (result.success) {
    Modal.closeAll();
    Notify.success('Payment successful! Your subscription is now active.');
    setTimeout(() => location.reload(), 1500);
  } else {
    Notify.error(result.error || 'Payment failed. Please try again.');
  }
}

// ... rest of the existing app.js code (initSettings, initTheme, initRouter, etc.) ...

/**
 * Initialize default settings
 */
function initSettings() {
  const defaultSettings = {
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    theme: 'dark',
    language: 'en',
    startOfMonth: 1
  };

  Storage.initDefaults({
    [Storage.KEYS.SETTINGS]: defaultSettings
  });

  State.set('settings', Storage.get(Storage.KEYS.SETTINGS), false);
}

/**
 * Initialize theme
 */
function initTheme() {
  const settings = State.get('settings') || {};
  const theme = settings.theme || 'dark';

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Router
 */
const Router = {
  routes: {
    '#dashboard': renderDashboard,
    '#transactions': renderTransactions,
    '#categories': renderCategories,
    '#budgets': renderBudgets,
    '#reports': renderReports,
    '#settings': renderSettings
  },

  init() {
    window.addEventListener('hashchange', () => this.resolve());
  },

  resolve() {
    // Check subscription before allowing access
    if (!Auth.isLoggedIn()) {
      showAuthModal();
      return;
    }

    const subStatus = Subscription.checkSubscriptionStatus();
    if (!subStatus.isActive) {
      showSubscriptionModal();
      return;
    }

    const hash = window.location.hash || '#dashboard';
    const route = hash.split('?')[0];

    if (this.routes[route]) {
      // Update sidebar active state
      $$('.sidebar-nav-item').forEach(item => {
        removeClass(item, 'active');
        if (item.getAttribute('href') === route) {
          addClass(item, 'active');
        }
      });

      // Hide all sections
      $$('.section').forEach(section => hide(section));

      // Show target section
      const targetSection = $(route);
      if (targetSection) {
        show(targetSection);
        addClass(targetSection, 'active');

        // Call route handler
        this.routes[route]();

        // Update header title
        updateHeaderTitle(route);
      }

      currentRoute = route;
    }
  },

  navigate(hash) {
    window.location.hash = hash;
  }
};

/**
 * Update header title based on route
 */
function updateHeaderTitle(route) {
  const titles = {
    '#dashboard': 'Dashboard',
    '#transactions': 'Transactions',
    '#categories': 'Categories',
    '#budgets': 'Budgets',
    '#reports': 'Reports',
    '#settings': 'Settings'
  };

  const titleEl = $('.header-title');
  if (titleEl) {
    titleEl.textContent = titles[route] || 'Expense Tracker';
  }
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Quick add button
  const quickAddBtn = $('.quick-add-btn');
  if (quickAddBtn) {
    on(quickAddBtn, 'click', () => openTransactionModal());
  }

  // Sidebar add button
  const sidebarAddBtn = $('#sidebar-add-btn');
  if (sidebarAddBtn) {
    on(sidebarAddBtn, 'click', () => openTransactionModal());
  }

  // Add transaction button on transactions page
  const addTransactionBtn = $('#add-transaction-btn');
  if (addTransactionBtn) {
    on(addTransactionBtn, 'click', () => openTransactionModal());
  }

  // Export CSV button
  const exportCsvBtn = $('#export-csv-btn');
  if (exportCsvBtn) {
    on(exportCsvBtn, 'click', () => {
      const transactions = Transactions.getAll();
      Export.toCSV(transactions, 'transactions.csv');
    });
  }

  // Select all checkbox
  const selectAllCheckbox = $('#select-all-checkbox');
  if (selectAllCheckbox) {
    on(selectAllCheckbox, 'change', (e) => {
      const checkboxes = $$('.transactions-table tbody input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const id = cb.closest('tr')?.dataset?.id;
        if (id) {
          if (e.target.checked) {
            selectedTransactions.add(id);
          } else {
            selectedTransactions.delete(id);
          }
        }
      });
      updateBulkActions();
    });
  }

  // Delete selected button
  const deleteSelectedBtn = $('#delete-selected');
  if (deleteSelectedBtn) {
    on(deleteSelectedBtn, 'click', async () => {
      if (selectedTransactions.size === 0) return;
      
      const confirmed = await Modal.confirm({
        title: 'Delete Selected',
        message: `Delete ${selectedTransactions.size} selected transactions?`,
        type: 'danger'
      });

      if (confirmed) {
        Transactions.removeMany(Array.from(selectedTransactions));
        selectedTransactions.clear();
        renderTransactionsTable();
        renderDashboard();
        updateBulkActions();
      }
    });
  }

  // Theme toggle
  const themeToggle = $('.theme-toggle');
  if (themeToggle) {
    on(themeToggle, 'click', toggleTheme);
  }

  // Logout button
  const logoutBtn = $('#logout-btn');
  if (logoutBtn) {
    on(logoutBtn, 'click', () => {
      Auth.logout();
      location.reload();
    });
  }

  // Subscription button
  const subBtn = $('#subscription-btn');
  if (subBtn) {
    on(subBtn, 'click', showSubscriptionModal);
  }
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const settings = State.get('settings') || {};
  const themes = ['dark', 'light'];
  const currentIndex = themes.indexOf(settings.theme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];

  settings.theme = nextTheme;
  State.set('settings', settings);
  Storage.set(Storage.KEYS.SETTINGS, settings);

  initTheme();
  Notify.success(`Theme set to ${nextTheme}`);
}

// ... (keep all the existing render functions: renderDashboard, renderTransactions, etc.) ...

/**
 * Render Dashboard
 */
function renderDashboard() {
  renderSummaryCards();
  renderUPISummary();
  renderCharts();
  renderRecentTransactions();
  renderBudgetProgress();
}

/**
 * Render UPI Payment Summary
 */
function renderUPISummary() {
  const container = $('#upi-payment-grid');
  const totalEl = $('#upi-total-spent');
  if (!container) return;

  const transactions = Transactions.getAll();
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  // UPI payment methods
  const upiMethods = {
    'paytm': { name: 'Paytm', icon: '📱', color: '#00B9F1' },
    'phonepe': { name: 'PhonePe', icon: '🟣', color: '#5F259F' },
    'gpay': { name: 'Google Pay', icon: '🔵', color: '#4285F4' },
    'amazonpay': { name: 'Amazon Pay', icon: '🟠', color: '#FF9900' },
    'bhim': { name: 'BHIM', icon: '🟢', color: '#00BFA5' },
    'other_upi': { name: 'Other UPI', icon: '📲', color: '#78909C' }
  };

  // Calculate spending by UPI method for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const upiStats = {};
  let totalUPISpent = 0;

  transactions.forEach(t => {
    if (t.type !== 'expense') return;
    
    const tDate = new Date(t.date);
    if (tDate < monthStart || tDate > monthEnd) return;
    
    const method = t.paymentMethod || 'cash';
    if (upiMethods[method]) {
      if (!upiStats[method]) {
        upiStats[method] = { amount: 0, count: 0 };
      }
      upiStats[method].amount += t.amount;
      upiStats[method].count += 1;
      totalUPISpent += t.amount;
    }
  });

  // Update total
  if (totalEl) {
    totalEl.textContent = `${formatCurrency(totalUPISpent, currencySymbol)} spent via UPI`;
  }

  // Clear container
  empty(container);

  // Render UPI cards
  const hasUPITransactions = Object.keys(upiStats).length > 0;
  
  if (!hasUPITransactions) {
    container.innerHTML = `
      <div class="upi-card" style="grid-column: 1 / -1;">
        <div class="upi-card-icon">📱</div>
        <div class="upi-card-name">No UPI payments this month</div>
        <div class="upi-card-amount">Add transactions to see summary</div>
      </div>
    `;
    return;
  }

  Object.entries(upiStats)
    .sort((a, b) => b[1].amount - a[1].amount)
    .forEach(([method, stats]) => {
      const config = upiMethods[method];
      const card = createElement('div', {
        className: 'upi-card',
        style: { borderColor: `${config.color}40` }
      }, [
        createElement('div', {
          className: 'upi-card-icon',
          style: { color: config.color }
        }, config.icon),
        createElement('div', {
          className: 'upi-card-name'
        }, config.name),
        createElement('div', {
          className: 'upi-card-amount',
          style: { color: config.color }
        }, formatCurrency(stats.amount, currencySymbol)),
        createElement('div', {
          className: 'upi-card-count'
        }, `${stats.count} transaction${stats.count !== 1 ? 's' : ''}`)
      ]);
      container.appendChild(card);
    });
}

/**
 * Render Summary Cards
 */
function renderSummaryCards() {
  const summary = Transactions.getSummary();
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  const balanceEl = $('#summary-balance');
  const incomeEl = $('#summary-income');
  const expenseEl = $('#summary-expense');
  const savingsEl = $('#summary-savings');

  if (balanceEl) balanceEl.textContent = formatCurrency(summary.balance, currencySymbol);
  if (incomeEl) incomeEl.textContent = formatCurrency(summary.thisMonthIncome, currencySymbol);
  if (expenseEl) expenseEl.textContent = formatCurrency(summary.thisMonthExpense, currencySymbol);
  if (savingsEl) savingsEl.textContent = Math.round(summary.savingsRate) + '%';
}

/**
 * Render Recent Transactions on Dashboard
 */
function renderRecentTransactions() {
  const container = $('#recent-transactions-list');
  if (!container) return;

  const transactions = Transactions.getRecent(5);
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  empty(container);

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">📭</div>
        <div class="table-empty-title">No transactions yet</div>
        <div class="table-empty-text">Add your first transaction to get started</div>
      </div>
    `;
    return;
  }

  transactions.forEach(t => {
    const category = categories.find(c => c.id === t.category) || { name: 'Unknown', icon: '📦', color: '#78909C' };
    const isIncome = t.type === 'income';
    
    const item = createElement('div', {
      className: 'transaction-item',
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'background 0.2s'
      },
      onclick: () => showTransactionDetail(t.id)
    }, [
      createElement('div', {
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${category.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          marginRight: '12px'
        }
      }, category.icon),
      createElement('div', {
        style: { flex: 1 }
      }, [
        createElement('div', {
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '2px'
          }
        }, category.name),
        createElement('div', {
          style: {
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }
        }, formatDate(t.date))
      ]),
      createElement('div', {
        style: {
          fontSize: '14px',
          fontWeight: '600',
          color: isIncome ? '#00D68F' : 'var(--text-primary)'
        }
      }, `${isIncome ? '+' : '-'}${formatCurrency(t.amount, currencySymbol)}`)
    ]);

    // Add hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-hover)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });

    container.appendChild(item);
  });
}

/**
 * Render Budget Progress
 */
function renderBudgetProgress() {
  const container = $('#budget-progress-grid');
  if (!container) return;

  const budgets = Budget.getAll();
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  empty(container);

  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="table-empty" style="padding: 24px;">
        <div class="table-empty-text">No budgets set</div>
      </div>
    `;
    return;
  }

  budgets.slice(0, 4).forEach(b => {
    const category = categories.find(c => c.id === b.categoryId) || { name: 'Unknown', icon: '📦', color: '#78909C' };
    const percentage = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    const isOverBudget = percentage > 100;

    const item = createElement('div', {
      className: 'budget-progress-item',
      style: {
        padding: '12px',
        borderRadius: '8px',
        background: 'var(--bg-elevated)'
      }
    }, [
      createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }
      }, [
        createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px' }
        }, [
          createElement('span', {}, category.icon),
          createElement('span', {
            style: { fontSize: '13px', color: 'var(--text-primary)' }
          }, category.name)
        ]),
        createElement('span', {
          style: {
            fontSize: '12px',
            color: isOverBudget ? '#FF4D6D' : 'var(--text-secondary)'
          }
        }, `${Math.round(percentage)}%`)
      ]),
      createElement('div', {
        style: {
          height: '6px',
          background: 'var(--bg-primary)',
          borderRadius: '3px',
          overflow: 'hidden'
        }
      }, [
        createElement('div', {
          style: {
            height: '100%',
            width: `${Math.min(percentage, 100)}%`,
            background: isOverBudget ? '#FF4D6D' : category.color,
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }
        })
      ]),
      createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }
      }, [
        createElement('span', {}, `${formatCurrency(b.spent, currencySymbol)} spent`),
        createElement('span', {}, `${formatCurrency(b.limit, currencySymbol)} limit`)
      ])
    ]);

    container.appendChild(item);
  });
}

/**
 * Render Charts
 */
function renderCharts() {
  Charts.renderAll();
}

/**
 * Render Transactions Page
 */
function renderTransactions() {
  renderTransactionsTable();
  setupTransactionFilters();
}

/**
 * Render Transactions Table
 */
function renderTransactionsTable() {
  const tbody = $('#transactions-table-body');
  if (!tbody) return;

  const transactions = Transactions.getAll();
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  // Apply filters
  let filtered = transactions;
  if (transactionFilters.search) {
    const search = transactionFilters.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.description.toLowerCase().includes(search) ||
      t.category.toLowerCase().includes(search)
    );
  }
  if (transactionFilters.type !== 'all') {
    filtered = filtered.filter(t => t.type === transactionFilters.type);
  }
  if (transactionFilters.startDate) {
    filtered = filtered.filter(t => t.date >= transactionFilters.startDate);
  }
  if (transactionFilters.endDate) {
    filtered = filtered.filter(t => t.date <= transactionFilters.endDate);
  }

  // Filter by payment method
  if (transactionFilters.paymentMethod && transactionFilters.paymentMethod !== 'all') {
    filtered = filtered.filter(t => (t.paymentMethod || 'cash') === transactionFilters.paymentMethod);
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  empty(tbody);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          <div class="table-empty-icon">📭</div>
          <div class="table-empty-title">No transactions found</div>
          <div class="table-empty-text">Try adjusting your filters or add a new transaction</div>
        </td>
      </tr>
    `;
    updatePagination(0, 0);
    return;
  }

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPage = transactionFilters.page || 1;
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  paginated.forEach(t => {
    const category = categories.find(c => c.id === t.category) || { name: 'Unknown', icon: '📦', color: '#78909C' };
    const isIncome = t.type === 'income';
    const isSelected = selectedTransactions.has(t.id);

    const tr = createElement('tr', {
      className: isSelected ? 'selected' : '',
      'data-id': t.id,
      style: { cursor: 'pointer' }
    });

    const paymentMethodLabels = {
      'cash': '💵 Cash',
      'paytm': '📱 Paytm',
      'phonepe': '🟣 PhonePe',
      'gpay': '🔵 Google Pay',
      'amazonpay': '🟠 Amazon Pay',
      'bhim': '🟢 BHIM',
      'other_upi': '📲 Other UPI',
      'card': '💳 Card',
      'netbanking': '🏦 Net Banking'
    };
    const paymentMethodLabel = paymentMethodLabels[t.paymentMethod] || '💵 Cash';
    const paymentMethodClass = t.paymentMethod || 'cash';

    tr.innerHTML = `
      <td class="cell-checkbox">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleTransactionSelection('${t.id}')">
      </td>
      <td class="cell-date">${formatDate(t.date)}</td>
      <td class="cell-category">
        <span class="cell-category-icon" style="color: ${category.color}">${category.icon}</span>
        <span>${category.name}</span>
      </td>
      <td class="cell-description">${t.description}</td>
      <td class="cell-amount ${t.type}">${isIncome ? '+' : '-'}${formatCurrency(t.amount, currencySymbol)}</td>
      <td class="cell-payment-method">
        <span class="payment-method-badge ${paymentMethodClass}">${paymentMethodLabel}</span>
      </td>
      <td class="cell-tags">${(t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</td>
      <td class="cell-actions">
        <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); editTransaction('${t.id}')" title="Edit">✏️</button>
        <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); deleteTransaction('${t.id}')" title="Delete">🗑️</button>
      </td>
    `;

    // Click row to show details
    tr.addEventListener('click', () => showTransactionDetail(t.id));

    tbody.appendChild(tr);
  });

  updatePagination(filtered.length, totalPages, currentPage);
}

/**
 * Setup Transaction Filters
 */
function setupTransactionFilters() {
  const searchInput = $('#filter-search');
  const typeBtns = $$('.type-toggle-btn');
  const startDate = $('#filter-start-date');
  const endDate = $('#filter-end-date');

  if (searchInput) {
    searchInput.value = transactionFilters.search || '';
    searchInput.addEventListener('input', debounce((e) => {
      transactionFilters.search = e.target.value;
      transactionFilters.page = 1;
      renderTransactionsTable();
    }, 300));
  }

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      transactionFilters.type = btn.dataset.type;
      transactionFilters.page = 1;
      renderTransactionsTable();
    });
  });

  if (startDate) {
    startDate.value = transactionFilters.startDate || '';
    startDate.addEventListener('change', (e) => {
      transactionFilters.startDate = e.target.value;
      renderTransactionsTable();
    });
  }

  if (endDate) {
    endDate.value = transactionFilters.endDate || '';
    endDate.addEventListener('change', (e) => {
      transactionFilters.endDate = e.target.value;
      renderTransactionsTable();
    });
  }

  // Payment Method Filter
  const paymentMethodFilter = $('#filter-payment-method');
  if (paymentMethodFilter) {
    paymentMethodFilter.value = transactionFilters.paymentMethod || 'all';
    paymentMethodFilter.addEventListener('change', (e) => {
      transactionFilters.paymentMethod = e.target.value;
      transactionFilters.page = 1;
      renderTransactionsTable();
    });
  }
}

/**
 * Update Pagination
 */
function updatePagination(total, totalPages, currentPage) {
  const info = $('#pagination-info');
  const controls = $('#pagination-controls');

  if (info) {
    info.textContent = `Showing ${total} transaction${total !== 1 ? 's' : ''}`;
  }

  if (controls && totalPages > 1) {
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    controls.innerHTML = html;
  } else if (controls) {
    controls.innerHTML = '';
  }
}

/**
 * Go to page
 */
window.goToPage = function(page) {
  transactionFilters.page = page;
  renderTransactionsTable();
};

/**
 * Toggle transaction selection
 */
window.toggleTransactionSelection = function(id) {
  if (selectedTransactions.has(id)) {
    selectedTransactions.delete(id);
  } else {
    selectedTransactions.add(id);
  }
  renderTransactionsTable();
  updateBulkActions();
};

/**
 * Update bulk actions UI
 */
function updateBulkActions() {
  const bulkActions = $('#bulk-actions');
  const count = $('#bulk-actions-count');

  if (bulkActions && count) {
    if (selectedTransactions.size > 0) {
      bulkActions.style.display = 'flex';
      count.textContent = `${selectedTransactions.size} selected`;
    } else {
      bulkActions.style.display = 'none';
    }
  }
}

/**
 * Edit transaction
 */
window.editTransaction = function(id) {
  editingTransactionId = id;
  const transaction = Transactions.getById(id);
  if (transaction) {
    openTransactionModal(transaction);
  }
};

/**
 * Delete transaction
 */
window.deleteTransaction = async function(id) {
  const confirmed = await Modal.confirm({
    title: 'Delete Transaction',
    message: 'Are you sure you want to delete this transaction?',
    type: 'danger'
  });

  if (confirmed) {
    Transactions.remove(id);
    renderTransactionsTable();
    renderDashboard();
  }
};

/**
 * Show Transaction Detail Modal (Paytm-like)
 */
function showTransactionDetail(id) {
  const transaction = Transactions.getById(id);
  if (!transaction) return;

  const categories = State.get('categories') || [];
  const category = categories.find(c => c.id === transaction.category) || { name: 'Unknown', icon: '📦', color: '#78909C' };
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  // Determine Paytm-like category
  const paytmCategory = getPaytmCategory(category.id, transaction.type);

  const { modal, body, footer } = Modal.create({
    title: '',
    size: 'md',
    closable: true
  });

  // Hide default header
  modal.querySelector('.modal-header').style.display = 'none';

  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? '#00D68F' : 'var(--text-primary)';
  const amountPrefix = isIncome ? '+' : '-';

  const detailContainer = createElement('div', {
    className: 'transaction-detail',
    style: {
      padding: '0',
      color: 'var(--text-primary)'
    }
  }, [
    // Header with category and icon
    createElement('div', {
      style: {
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-primary) 100%)',
        padding: '32px 24px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)'
      }
    }, [
      createElement('div', {
        style: {
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: `${category.color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          margin: '0 auto 16px',
          boxShadow: `0 8px 32px ${category.color}30`
        }
      }, category.icon),
      createElement('div', {
        style: {
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px'
        }
      }, paytmCategory),
      createElement('div', {
        style: {
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '4px'
        }
      }, category.name),
      createElement('div', {
        style: {
          fontSize: '32px',
          fontWeight: '700',
          color: amountColor,
          fontFamily: 'var(--font-mono)'
        }
      }, `${amountPrefix}${formatCurrency(transaction.amount, currencySymbol)}`)
    ]),

    // Transaction Details
    createElement('div', {
      style: {
        padding: '24px'
      }
    }, [
      // Status Badge
      createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }
      }, [
        createElement('span', {
          style: {
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: isIncome ? '#00D68F20' : '#4D9FFF20',
            color: isIncome ? '#00D68F' : '#4D9FFF'
          }
        }, isIncome ? '✓ Completed' : '✓ Paid Successfully')
      ]),

      // Transaction ID / Key
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Transaction ID'),
        createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px' }
        }, [
          createElement('span', {
            style: {
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--text-primary)'
            }
          }, transaction.id.toUpperCase()),
          createElement('button', {
            style: {
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
              borderRadius: '4px'
            },
            onclick: () => {
              navigator.clipboard.writeText(transaction.id);
              Notify.success('Transaction ID copied!');
            },
            title: 'Copy ID'
          }, '📋')
        ])
      ]),

      // Date & Time
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Date & Time'),
        createElement('span', {
          style: { color: 'var(--text-primary)', fontSize: '14px' }
        }, formatDateTime(transaction.date))
      ]),

      // Description
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Description'),
        createElement('span', {
          style: { color: 'var(--text-primary)', fontSize: '14px', textAlign: 'right', maxWidth: '200px' }
        }, transaction.description || '-')
      ]),

      // Category
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Category'),
        createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '6px' }
        }, [
          createElement('span', {}, category.icon),
          createElement('span', {
            style: { color: 'var(--text-primary)', fontSize: '14px' }
          }, category.name)
        ])
      ]),

      // Payment Method
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Payment Method'),
        createElement('span', {
          style: { color: 'var(--text-primary)', fontSize: '14px' }
        }, getPaymentMethodLabel(transaction.paymentMethod || 'cash'))
      ]),

      // Tags if any
      ...(transaction.tags && transaction.tags.length > 0 ? [
        createElement('div', {
          className: 'detail-row',
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)'
          }
        }, [
          createElement('span', {
            style: { color: 'var(--text-secondary)', fontSize: '14px' }
          }, 'Tags'),
          createElement('div', {
            style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }
          }, transaction.tags.map(tag => createElement('span', {
            style: {
              padding: '4px 10px',
              background: 'var(--bg-elevated)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }
          }, tag)))
        ])
      ] : []),

      // Created At
      createElement('div', {
        className: 'detail-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0'
        }
      }, [
        createElement('span', {
          style: { color: 'var(--text-secondary)', fontSize: '14px' }
        }, 'Recorded On'),
        createElement('span', {
          style: { color: 'var(--text-muted)', fontSize: '13px' }
        }, formatDateTime(transaction.createdAt))
      ])
    ]),

    // Action Buttons
    createElement('div', {
      style: {
        display: 'flex',
        gap: '12px',
        padding: '0 24px 24px'
      }
    }, [
      createElement('button', {
        className: 'btn btn-secondary',
        style: { flex: 1 },
        onclick: () => {
          Modal.close(modal);
          editTransaction(id);
        }
      }, '✏️ Edit'),
      createElement('button', {
        className: 'btn btn-danger',
        style: { flex: 1 },
        onclick: async () => {
          const confirmed = await Modal.confirm({
            title: 'Delete Transaction',
            message: 'Are you sure you want to delete this transaction?',
            type: 'danger'
          });
          if (confirmed) {
            Modal.close(modal);
            Transactions.remove(id);
            renderTransactionsTable();
            renderDashboard();
          }
        }
      }, '🗑️ Delete')
    ])
  ]);

  body.appendChild(detailContainer);
  footer.style.display = 'none';

  Modal.open(modal);
}

/**
 * Get Paytm-like category based on transaction category
 */
function getPaytmCategory(categoryId, type) {
  const categoryMap = {
    'cat_food': 'Food & Dining',
    'cat_transport': 'Travel & Transport',
    'cat_housing': 'Housing & Rent',
    'cat_health': 'Health & Wellness',
    'cat_entertainment': 'Entertainment',
    'cat_utilities': 'Recharge & Bills',
    'cat_shopping': 'Shopping',
    'cat_education': 'Education',
    'cat_salary': 'Money Transfer',
    'cat_freelance': 'Money Transfer',
    'cat_investment': 'Investments',
    'cat_other': 'Others'
  };

  if (type === 'income') {
    return 'Money Transfer';
  }

  return categoryMap[categoryId] || 'Others';
}

/**
 * Get payment mode based on category
 */
function getPaymentMode(categoryId) {
  const modes = {
    'cat_food': 'UPI / Card',
    'cat_transport': 'UPI / Wallet',
    'cat_housing': 'Bank Transfer',
    'cat_health': 'Card / UPI',
    'cat_entertainment': 'UPI / Wallet',
    'cat_utilities': 'Auto-debit / UPI',
    'cat_shopping': 'Card / UPI',
    'cat_education': 'Bank Transfer',
    'cat_salary': 'Bank Transfer',
    'cat_freelance': 'Bank Transfer',
    'cat_investment': 'Bank Transfer',
    'cat_other': 'Cash / UPI'
  };

  return modes[categoryId] || 'UPI';
}

/**
 * Get payment method label
 * @param {string} method - Payment method value
 * @returns {string} Display label
 */
function getPaymentMethodLabel(method) {
  const labels = {
    'cash': '💵 Cash',
    'paytm': '📱 Paytm',
    'phonepe': '🟣 PhonePe',
    'gpay': '🔵 Google Pay',
    'amazonpay': '🟠 Amazon Pay',
    'bhim': '🟢 BHIM',
    'other_upi': '📲 Other UPI',
    'card': '💳 Card',
    'netbanking': '🏦 Net Banking'
  };

  return labels[method] || '💵 Cash';
}

/**
 * Format date and time
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Open Transaction Modal (Add/Edit)
 */
function openTransactionModal(transaction = null) {
  const isEdit = !!transaction;
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};

  const { modal, body, footer } = Modal.create({
    title: isEdit ? 'Edit Transaction' : 'Add Transaction',
    size: 'md',
    closable: true
  });

  const form = createElement('form', {
    id: 'transaction-form',
    style: { display: 'flex', flexDirection: 'column', gap: '16px' }
  });

  // Type toggle
  const typeGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Type'),
    createElement('div', {
      className: 'type-toggle',
      style: { display: 'flex', gap: '8px' }
    }, [
      createElement('button', {
        type: 'button',
        className: `type-toggle-btn ${!isEdit || transaction.type === 'expense' ? 'active' : ''}`,
        'data-type': 'expense',
        onclick: function() {
          updateTypeToggle(this, 'expense');
        }
      }, 'Expense'),
      createElement('button', {
        type: 'button',
        className: `type-toggle-btn ${isEdit && transaction.type === 'income' ? 'active' : ''}`,
        'data-type': 'income',
        onclick: function() {
          updateTypeToggle(this, 'income');
        }
      }, 'Income')
    ]),
    createElement('input', {
      type: 'hidden',
      name: 'type',
      value: isEdit ? transaction.type : 'expense'
    })
  ]);

  // Amount
  const amountGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Amount'),
    createElement('div', {
      className: 'amount-input-wrapper',
      style: { position: 'relative' }
    }, [
      createElement('span', {
        style: {
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)'
        }
      }, settings.currencySymbol || '₹'),
      createElement('input', {
        type: 'number',
        name: 'amount',
        className: 'form-input',
        placeholder: '0.00',
        step: '0.01',
        required: true,
        value: isEdit ? transaction.amount : '',
        style: { paddingLeft: '32px' }
      })
    ])
  ]);

  // Category
  const categoryGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Category'),
    createElement('select', {
      name: 'category',
      className: 'form-input',
      required: true
    }, [
      createElement('option', { value: '' }, 'Select category'),
      ...categories.map(c => createElement('option', {
        value: c.id,
        selected: isEdit && transaction.category === c.id
      }, `${c.icon} ${c.name}`))
    ])
  ]);

  // Description
  const descGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Description'),
    createElement('input', {
      type: 'text',
      name: 'description',
      className: 'form-input',
      placeholder: 'Enter description',
      required: true,
      value: isEdit ? transaction.description : ''
    })
  ]);

  // Date
  const dateGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Date'),
    createElement('input', {
      type: 'date',
      name: 'date',
      className: 'form-input',
      required: true,
      value: isEdit ? transaction.date : new Date().toISOString().split('T')[0]
    })
  ]);

  // Payment Method
  const paymentMethods = [
    { value: 'cash', label: '💵 Cash', icon: '💵' },
    { value: 'paytm', label: '📱 Paytm', icon: '📱' },
    { value: 'phonepe', label: '🟣 PhonePe', icon: '🟣' },
    { value: 'gpay', label: '🔵 Google Pay', icon: '🔵' },
    { value: 'amazonpay', label: '🟠 Amazon Pay', icon: '🟠' },
    { value: 'bhim', label: '🟢 BHIM', icon: '🟢' },
    { value: 'other_upi', label: '📲 Other UPI', icon: '📲' },
    { value: 'card', label: '💳 Card', icon: '💳' },
    { value: 'netbanking', label: '🏦 Net Banking', icon: '🏦' }
  ];

  const paymentMethodGroup = createElement('div', { className: 'form-group' }, [
    createElement('label', { className: 'form-label' }, 'Payment Method'),
    createElement('select', {
      name: 'paymentMethod',
      className: 'form-input',
      required: true
    }, [
      ...paymentMethods.map(pm => createElement('option', {
        value: pm.value,
        selected: isEdit ? transaction.paymentMethod === pm.value : pm.value === 'cash'
      }, pm.label))
    ])
  ]);

  form.appendChild(typeGroup);
  form.appendChild(amountGroup);
  form.appendChild(categoryGroup);
  form.appendChild(descGroup);
  form.appendChild(dateGroup);
  form.appendChild(paymentMethodGroup);

  body.appendChild(form);

  // Footer buttons
  footer.appendChild(createElement('button', {
    type: 'button',
    className: 'btn btn-secondary',
    onclick: () => Modal.close(modal)
  }, 'Cancel'));

  footer.appendChild(createElement('button', {
    type: 'button',
    className: 'btn btn-primary',
    onclick: () => handleTransactionSubmit(modal, isEdit ? transaction.id : null)
  }, isEdit ? 'Update' : 'Add'));

  Modal.open(modal);
}

/**
 * Update type toggle UI
 */
function updateTypeToggle(btn, type) {
  const form = btn.closest('form');
  const hiddenInput = form.querySelector('[name="type"]');
  const buttons = form.querySelectorAll('.type-toggle-btn');

  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  hiddenInput.value = type;
}

/**
 * Handle transaction form submit
 */
function handleTransactionSubmit(modal, id) {
  const form = $('#transaction-form');
  const formData = new FormData(form);
  const data = {
    type: formData.get('type'),
    amount: parseFloat(formData.get('amount')),
    category: formData.get('category'),
    description: formData.get('description'),
    date: formData.get('date'),
    paymentMethod: formData.get('paymentMethod') || 'cash',
    tags: []
  };

  const categories = State.get('categories') || [];
  const validation = validateTransaction(data, categories);

  if (!validation.valid) {
    const errors = Object.values(validation.errors).join(', ');
    Notify.error(errors);
    return;
  }

  if (id) {
    Transactions.update(id, data);
  } else {
    Transactions.create(data);
  }

  Modal.close(modal);
  renderTransactionsTable();
  renderDashboard();
  editingTransactionId = null;
}

/**
 * Render Categories Page
 */
function renderCategories() {
  const grid = $('#categories-grid');
  if (!grid) return;

  const categories = State.get('categories') || [];

  empty(grid);

  categories.forEach(c => {
    const card = createElement('div', {
      className: 'card category-card',
      style: { cursor: 'pointer' }
    }, [
      createElement('div', {
        className: 'category-icon',
        style: {
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: `${c.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          marginBottom: '12px'
        }
      }, c.icon),
      createElement('h3', {
        style: {
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '4px'
        }
      }, c.name),
      createElement('p', {
        style: {
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textTransform: 'capitalize'
        }
      }, c.type)
    ]);

    grid.appendChild(card);
  });
}

/**
 * Render Budgets Page
 */
function renderBudgets() {
  const list = $('#category-budgets-list');
  if (!list) return;

  const budgets = Budget.getAll();
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  empty(list);

  if (budgets.length === 0) {
    list.innerHTML = `
      <div class="table-empty" style="padding: 32px;">
        <div class="table-empty-text">No budgets configured</div>
      </div>
    `;
    return;
  }

  budgets.forEach(b => {
    const category = categories.find(c => c.id === b.categoryId) || { name: 'Unknown', icon: '📦', color: '#78909C' };
    const percentage = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    const isOverBudget = percentage > 100;

    const item = createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid var(--border-subtle)'
      }
    }, [
      createElement('div', {
        style: {
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `${category.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          marginRight: '16px'
        }
      }, category.icon),
      createElement('div', { style: { flex: 1 } }, [
        createElement('div', {
          style: {
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px'
          }
        }, category.name),
        createElement('div', {
          style: {
            height: '6px',
            background: 'var(--bg-primary)',
            borderRadius: '3px',
            overflow: 'hidden'
          }
        }, [
          createElement('div', {
            style: {
              height: '100%',
              width: `${Math.min(percentage, 100)}%`,
              background: isOverBudget ? '#FF4D6D' : category.color,
              borderRadius: '3px'
            }
          })
        ])
      ]),
      createElement('div', {
        style: { textAlign: 'right', marginLeft: '16px' }
      }, [
        createElement('div', {
          style: {
            fontSize: '14px',
            fontWeight: '600',
            color: isOverBudget ? '#FF4D6D' : 'var(--text-primary)'
          }
        }, `${Math.round(percentage)}%`),
        createElement('div', {
          style: {
            fontSize: '12px',
            color: 'var(--text-muted)'
          }
        }, `${formatCurrency(b.spent, currencySymbol)} / ${formatCurrency(b.limit, currencySymbol)}`)
      ])
    ]);

    list.appendChild(item);
  });
}

/**
 * Render Reports Page
 */
function renderReports() {
  renderMonthlySummary();
  renderCategoryBreakdown();
}

/**
 * Render Monthly Summary
 */
function renderMonthlySummary() {
  const tbody = $('#monthly-summary-table');
  if (!tbody) return;

  const transactions = Transactions.getAll();
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  // Group by month
  const monthly = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!monthly[key]) {
      monthly[key] = { month: monthName, income: 0, expense: 0, count: 0 };
    }

    if (t.type === 'income') {
      monthly[key].income += t.amount;
    } else {
      monthly[key].expense += t.amount;
    }
    monthly[key].count++;
  });

  const sorted = Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

  empty(tbody);

  sorted.forEach(([_, data]) => {
    const net = data.income - data.expense;
    const tr = createElement('tr', {}, [
      createElement('td', {}, data.month),
      createElement('td', { style: { color: '#00D68F' } }, formatCurrency(data.income, currencySymbol)),
      createElement('td', { style: { color: 'var(--text-primary)' } }, formatCurrency(data.expense, currencySymbol)),
      createElement('td', { style: { color: net >= 0 ? '#00D68F' : '#FF4D6D', fontWeight: '600' } }, formatCurrency(net, currencySymbol)),
      createElement('td', {}, data.count.toString())
    ]);
    tbody.appendChild(tr);
  });
}

/**
 * Render Category Breakdown
 */
function renderCategoryBreakdown() {
  const tbody = $('#category-breakdown-table');
  if (!tbody) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const spending = Transactions.getSpendingByCategory(startOfMonth, endOfMonth);
  const total = spending.reduce((sum, s) => sum + s.amount, 0);
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  empty(tbody);

  spending.forEach(s => {
    const percentage = total > 0 ? (s.amount / total) * 100 : 0;
    const tr = createElement('tr', {}, [
      createElement('td', {}, [
        createElement('span', { style: { marginRight: '8px' } }, s.icon),
        s.name
      ]),
      createElement('td', {}, s.count.toString()),
      createElement('td', {}, formatCurrency(s.amount, currencySymbol)),
      createElement('td', {}, `${percentage.toFixed(1)}%`)
    ]);
    tbody.appendChild(tr);
  });
}

/**
 * Render Settings Page
 */
function renderSettings() {
  // Settings are handled by form elements in HTML
}

/**
 * Open Category Modal
 */
function openCategoryModal() {
  Notify.info('Category management coming soon!');
}

// Initialize app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose functions globally for HTML access
window.Router = Router;
window.showAuthModal = showAuthModal;
window.showSubscriptionModal = showSubscriptionModal;
window.openCategoryModal = openCategoryModal;
