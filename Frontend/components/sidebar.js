// ============================================================
// sidebar.js – Reusable Sidebar Component
// ============================================================

/**
 * Build a sidebar nav dynamically.
 * @param {string} containerId
 * @param {Array}  items - [{ label, icon, section }]
 * @param {string} defaultSection - which section to show first
 */
function renderSidebar(containerId, items, defaultSection) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const user = getUser();
  const name = user ? (user.name || user.email) : 'User';
  const initial = name[0].toUpperCase();

  container.innerHTML = `
    <div class="p-4 border-b border-blue-50 flex items-center gap-3">
      <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">${initial}</div>
      <div>
        <p class="font-semibold text-sm text-gray-800">${name}</p>
        <p class="text-xs text-gray-400">${user?.role || 'user'}</p>
      </div>
    </div>
    <nav class="flex-1 p-4">
      <ul class="space-y-1">
        ${items.map(item => `
          <li>
            <button onclick="showSection('${item.section}')"
              class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                     ${item.section === defaultSection ? 'active' : ''}">
              ${item.icon} ${item.label}
            </button>
          </li>
        `).join('')}
      </ul>
    </nav>
    <div class="p-4 border-t border-blue-50">
      <button onclick="logout()"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition">
        🚪 Logout
      </button>
    </div>`;
}
