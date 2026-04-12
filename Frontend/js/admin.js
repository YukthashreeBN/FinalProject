/**
 * admin.js – Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initSidebar();
  activateSection('overview');
});

function requireAuth() {
  const user = getStoredUser();
  if (!user) window.location.href = 'login.html';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
}

function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const logoutBtn = document.getElementById('logoutBtn');

  toggleBtn && toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
  });
  overlay && overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  });
  logoutBtn && logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    window.location.href = 'login.html';
  });

  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const s = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      activateSection(s);
      sidebar.classList.remove('open');
      overlay.classList.add('hidden');
    });
  });
}

function activateSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`section-${name}`);
  if (el) el.classList.remove('hidden');
  const titles = { overview: 'Admin Overview', users: 'Manage Users', teachers: 'Approve Teachers', activity: 'Platform Activity', payments: 'Payment Records' };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[name] || name;

  const loaders = { users: loadUsers, teachers: loadPendingTeachers, payments: loadPayments };
  if (loaders[name]) loaders[name]();
}

// ─── Users ────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">Loading users...</td></tr>';
  try {
    const res   = await AdminAPI.getUsers();
    // Backend returns { users: [...] }, simulation returns same shape
    const users = res.data.users || (Array.isArray(res.data) ? res.data : []);
    const statusColors = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-700' };
    tbody.innerHTML = users.map(u => {
      const joinedDate = u.joined || (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A');
      const status     = u.status || 'active';
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-5 py-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">${u.name.charAt(0)}</div>
              <div><div class="font-medium text-sm text-gray-900">${u.name}</div><div class="text-xs text-gray-400">${u.email}</div></div>
            </div>
          </td>
          <td class="px-5 py-3 text-sm capitalize text-gray-600">${u.role}</td>
          <td class="px-5 py-3"><span class="${statusColors[status] || 'bg-gray-100 text-gray-600'} text-xs px-2 py-0.5 rounded-full font-medium capitalize">${status}</span></td>
          <td class="px-5 py-3 text-sm text-gray-500">${joinedDate}</td>
          <td class="px-5 py-3">
            <div class="flex gap-2">
              <button class="text-xs text-blue-600 hover:underline font-medium">View</button>
              <button class="text-xs text-red-500 hover:underline font-medium">Remove</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-red-400">Failed to load users.</td></tr>'; }
}

// ─── Pending Teachers ─────────────────────────────────────
async function loadPendingTeachers() {
  const list = document.getElementById('teacherApprovalList');
  if (!list) return;
  list.innerHTML = '<div class="text-center text-gray-400 py-8">Loading...</div>';
  try {
    const res      = await AdminAPI.getTeachers();
    const teachers = res.data.teachers || [];
    if (!teachers.length) { list.innerHTML = '<div class="text-center text-gray-400 py-8">No pending approvals.</div>'; return; }
    list.innerHTML = teachers.map(t => {
      const tid = t.id || t._id;
      return `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold text-lg">${t.name.charAt(0)}</div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900">${t.name}</div>
            <div class="text-sm text-gray-500">${t.email}</div>
            <div class="text-xs text-gray-400 mt-0.5">Subject: ${t.subject || 'N/A'} • Experience: ${t.experience || 'N/A'}</div>
          </div>
          <div class="flex gap-2">
            <button class="approve-btn bg-green-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition" data-id="${tid}">Approve</button>
            <button class="reject-btn bg-red-100 text-red-600 text-sm px-4 py-2 rounded-xl font-semibold hover:bg-red-200 transition" data-id="${tid}">Reject</button>
          </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await AdminAPI.approveTeacher(btn.dataset.id); showToast('Teacher approved! ✅', 'success'); loadPendingTeachers(); }
        catch { showToast('Failed to approve.', 'error'); }
      });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await AdminAPI.rejectTeacher(btn.dataset.id); showToast('Teacher rejected.', 'info'); loadPendingTeachers(); }
        catch { showToast('Failed to reject.', 'error'); }
      });
    });
  } catch { list.innerHTML = '<div class="text-center text-red-400 py-8">Failed to load.</div>'; }
}

// ─── Payments ─────────────────────────────────
async function loadPayments() {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Loading...</td></tr>';
  try {
    const res      = await AdminAPI.getPayments();
    const payments = res.data.payments || [];
    tbody.innerHTML = payments.map(p => `
      <tr class="hover:bg-gray-50">
        <td class="px-5 py-3 text-sm font-mono text-blue-600">${p.orderId}</td>
        <td class="px-5 py-3 text-sm text-gray-700">${p.student}</td>
        <td class="px-5 py-3 text-sm text-gray-600">${p.course}</td>
        <td class="px-5 py-3 text-sm font-semibold text-gray-900">${p.amount}</td>
        <td class="px-5 py-3"><span class="${p.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs px-2 py-0.5 rounded-full font-medium capitalize">${p.status}</span></td>
        <td class="px-5 py-3 text-sm text-gray-500">${p.date}</td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-red-400">Failed to load.</td></tr>'; }
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
