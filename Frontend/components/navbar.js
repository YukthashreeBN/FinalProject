// ============================================================
// navbar.js – Reusable Navbar Component
// ============================================================

/**
 * Render a top navbar into a given element.
 * @param {string} containerId - ID of container element
 * @param {Object} options - { role, userName, activePage }
 */
function renderNavbar(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { role = 'student', userName = 'User', activePage = '' } = options;

  container.innerHTML = `
    <nav class="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between">
      <a href="index.html" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13
                 C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13
                 C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13
                 C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <span class="font-bold text-primary text-lg">LiveLearn Plus</span>
      </a>
      <div class="flex items-center gap-4">
        <span class="hidden md:inline text-sm text-gray-500">${userName}</span>
        <span class="text-xs font-semibold px-2 py-1 rounded-full
          ${role === 'teacher' ? 'bg-green-100 text-green-700' :
            role === 'admin'   ? 'bg-purple-100 text-purple-700' :
                                 'bg-blue-100 text-blue-700'}">
          ${capitalize(role)}
        </span>
        <button onclick="logout()"
          class="text-xs text-red-500 hover:text-red-700 font-medium transition">
          Logout
        </button>
      </div>
    </nav>`;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
