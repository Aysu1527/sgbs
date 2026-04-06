/**
 * Charts Module
 * Chart rendering using Canvas API
 */

// Chart colors
const CHART_COLORS = [
  '#00D68F', '#4D9FFF', '#FFB74D', '#FF4D6D', '#9B72FF',
  '#00BCD4', '#E91E63', '#8BC34A', '#FF9800', '#3F51B5'
];

/**
 * Get canvas context
 * @param {string} canvasId - Canvas element ID
 * @returns {CanvasRenderingContext2D|null} Canvas context
 */
function getContext(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  return ctx;
}

/**
 * Clear canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw donut chart
 * @param {string} canvasId - Canvas ID
 * @param {Array} data - Chart data [{ label, value, color }]
 * @param {Object} options - Chart options
 */
function drawDonut(canvasId, data, options = {}) {
  const ctx = getContext(canvasId);
  if (!ctx) return;

  const canvas = document.getElementById(canvasId);
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;

  clearCanvas(ctx, width, height);

  const { centerText = '', centerValue = '' } = options;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const innerRadius = radius * 0.6;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    // Draw empty state
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#2A2A3A';
    ctx.lineWidth = 20;
    ctx.stroke();

    ctx.fillStyle = '#8888AA';
    ctx.font = '14px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText('No data', centerX, centerY);
    return;
  }

  let currentAngle = -Math.PI / 2;

  // Draw segments
  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    currentAngle += sliceAngle;
  });

  // Draw center text
  if (centerText || centerValue) {
    ctx.fillStyle = '#8888AA';
    ctx.font = '12px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(centerText, centerX, centerY - 8);

    ctx.fillStyle = '#F0F0F5';
    ctx.font = 'bold 20px "JetBrains Mono"';
    ctx.fillText(centerValue, centerX, centerY + 16);
  }
}

/**
 * Draw bar chart
 * @param {string} canvasId - Canvas ID
 * @param {Array} data - Chart data [{ label, value, color }]
 * @param {Object} options - Chart options
 */
function drawBar(canvasId, data, options = {}) {
  const ctx = getContext(canvasId);
  if (!ctx) return;

  const canvas = document.getElementById(canvasId);
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;

  clearCanvas(ctx, width, height);

  const { dual = false, data2 = [] } = options;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate max value
  let maxValue = 0;
  data.forEach(d => {
    maxValue = Math.max(maxValue, d.value);
    if (dual && data2[data.indexOf(d)]) {
      maxValue = Math.max(maxValue, data2[data.indexOf(d)].value);
    }
  });

  if (maxValue === 0) maxValue = 1;

  // Draw Y axis
  ctx.strokeStyle = '#2A2A3A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.stroke();

  // Draw Y axis labels
  ctx.fillStyle = '#8888AA';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 5; i++) {
    const value = (maxValue / 5) * i;
    const y = height - padding.bottom - (chartHeight / 5) * i;
    ctx.fillText(formatValue(value), padding.left - 8, y + 3);

    // Grid line
    if (i > 0) {
      ctx.strokeStyle = '#1F1F2E';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  // Draw bars
  const barWidth = (chartWidth / data.length) * 0.6;
  const barSpacing = (chartWidth / data.length) * 0.4;

  data.forEach((item, index) => {
    const x = padding.left + (index * (barWidth + barSpacing)) + barSpacing / 2;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = height - padding.bottom - barHeight;

    // Bar
    const color = item.color || CHART_COLORS[0];
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Second bar for dual chart
    if (dual && data2[index]) {
      const barHeight2 = (data2[index].value / maxValue) * chartHeight;
      const y2 = height - padding.bottom - barHeight2;
      ctx.fillStyle = data2[index].color || CHART_COLORS[1];
      ctx.fillRect(x + barWidth / 2, y2, barWidth / 2, barHeight2);
    }

    // X axis label
    ctx.fillStyle = '#8888AA';
    ctx.font = '10px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + barWidth / 2, height - padding.bottom + 15);
  });

  // Draw X axis
  ctx.strokeStyle = '#2A2A3A';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

/**
 * Draw line chart
 * @param {string} canvasId - Canvas ID
 * @param {Array} data - Chart data [{ label, value }]
 * @param {Object} options - Chart options
 */
function drawLine(canvasId, data, options = {}) {
  const ctx = getContext(canvasId);
  if (!ctx) return;

  const canvas = document.getElementById(canvasId);
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;

  clearCanvas(ctx, width, height);

  const { color = '#00D68F', fill = true } = options;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate max value
  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Draw Y axis labels
  ctx.fillStyle = '#8888AA';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 5; i++) {
    const value = (maxValue / 5) * i;
    const y = height - padding.bottom - (chartHeight / 5) * i;
    ctx.fillText(formatValue(value), padding.left - 8, y + 3);
  }

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const points = data.map((item, index) => ({
    x: padding.left + (index / (data.length - 1)) * chartWidth,
    y: height - padding.bottom - (item.value / maxValue) * chartHeight
  }));

  // Smooth curve
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  // Fill area under line
  if (fill) {
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = color + '20'; // 20% opacity
    ctx.fill();
  }

  // Draw points
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#111118';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // X axis label
    ctx.fillStyle = '#8888AA';
    ctx.font = '10px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(data[index].label, point.x, height - padding.bottom + 15);
  });

  // Draw axes
  ctx.strokeStyle = '#2A2A3A';
  ctx.lineWidth = 1;

  // Y axis
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.stroke();

  // X axis
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

/**
 * Format value for axis labels
 * @param {number} value - Value to format
 * @returns {string} Formatted value
 */
function formatValue(value) {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  return value.toFixed(0);
}

/**
 * Initialize charts (resize handler)
 */
function init() {
  window.addEventListener('resize', debounce(() => {
    // Trigger re-render of visible charts
    document.querySelectorAll('canvas').forEach(canvas => {
      const event = new CustomEvent('chartResize');
      canvas.dispatchEvent(event);
    });
  }, 250));
}

/**
 * Render all dashboard charts
 */
async function renderAll() {
  const { Transactions } = await import('./transactions.js');
  const { State } = await import('./state.js');
  
  const transactions = Transactions.getAll();
  const categories = State.get('categories') || [];
  const settings = State.get('settings') || {};
  const currencySymbol = settings.currencySymbol || '₹';

  // Get current month spending by category
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const spending = Transactions.getSpendingByCategory(startOfMonth, endOfMonth);

  // Donut chart data
  const donutData = spending.slice(0, 6).map(s => ({
    label: s.name,
    value: s.amount,
    color: s.color
  }));

  const totalSpending = spending.reduce((sum, s) => sum + s.amount, 0);

  drawDonut('donut-chart', donutData, {
    centerText: 'Spent',
    centerValue: formatCurrency(totalSpending, currencySymbol)
  });

  // Monthly bar chart data
  const monthlyData = Transactions.getMonthlyData(6);
  const barData = monthlyData.map(m => ({
    label: m.month,
    income: m.income,
    expense: m.expense
  }));

  drawBar('bar-chart', barData, {
    colors: { income: '#00D68F', expense: '#4D9FFF' }
  });

  // Daily spending line chart
  const dailyData = Transactions.getDailySpending(30);
  const lineData = dailyData.map(d => ({
    label: d.day,
    value: d.amount
  }));

  drawLine('line-chart', lineData, {
    color: '#4D9FFF',
    fill: true
  });
}

/**
 * Format currency helper
 */
function formatCurrency(amount, symbol = '₹') {
  return symbol + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Debounce helper
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Charts API
export const Charts = {
  init,
  renderAll,
  drawDonut,
  drawBar,
  drawLine
};

export default Charts;
