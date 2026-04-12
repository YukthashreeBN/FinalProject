// ============================================================
// card.js – Reusable Card Component helpers
// ============================================================

/**
 * Create a generic info card HTML string.
 * @param {Object} opts - { title, subtitle, badge, body, footer, accentColor }
 */
function createCard({ title, subtitle, badge, body, footer, accentColor = '#1D4ED8' }) {
  return `
    <div class="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <div class="h-1.5" style="background:${accentColor}"></div>
      <div class="p-5">
        ${badge ? `<span class="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-2">${badge}</span>` : ''}
        <h3 class="font-bold text-gray-800 text-base mb-1">${title}</h3>
        ${subtitle ? `<p class="text-sm text-gray-500 mb-3">${subtitle}</p>` : ''}
        ${body ? `<div class="text-sm text-gray-600 mb-3">${body}</div>` : ''}
        ${footer ? `<div class="pt-3 border-t border-gray-50">${footer}</div>` : ''}
      </div>
    </div>`;
}

/**
 * Create a stat card HTML string.
 * @param {Object} opts - { label, value, change, icon }
 */
function createStatCard({ label, value, change, icon }) {
  const isPositive = change && change.startsWith('+');
  return `
    <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs text-gray-500 mb-1">${label}</p>
          <p class="text-3xl font-bold text-primary">${value}</p>
          ${change ? `<p class="text-xs mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}">${change}</p>` : ''}
        </div>
        ${icon ? `<div class="text-3xl">${icon}</div>` : ''}
      </div>
    </div>`;
}
