/**
 * admin.js – Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initSidebar();
  activateSection('overview');

  const closeIcon = document.getElementById('closeUserModal');
  const closeBtn = document.getElementById('closeUserModalBtn');
  if (closeIcon) closeIcon.addEventListener('click', closeUserModal);
  if (closeBtn) closeBtn.addEventListener('click', closeUserModal);

  const userSearch = document.getElementById('userSearch');
  const userRoleFilter = document.getElementById('userRoleFilter');
  if (userSearch) userSearch.addEventListener('input', renderUsers);
  if (userRoleFilter) userRoleFilter.addEventListener('change', renderUsers);
});

function requireAuth() {
  const user = getStoredUser();
  if (!user || user.role !== 'admin') window.location.href = 'login.html';
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
  const titles = { overview: 'Admin Overview', users: 'Manage Users', courses: 'Manage Courses', teachers: 'Approve Teachers', activity: 'Platform Activity', payments: 'Payment Records' };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[name] || name;

  const loaders = { overview: loadOverview, users: loadUsers, courses: loadCourses, teachers: loadPendingTeachers, payments: loadPayments, activity: loadActivity };
  if (loaders[name]) loaders[name]();
}

// ─── Overview ────────────────────────────────────────────
async function loadOverview() {
  const list = document.getElementById('pendingApprovals');
  const recentList = document.getElementById('recentPaymentsList');
  if (!list) return;
  list.innerHTML = '<div class="text-center text-gray-400 py-4">Loading...</div>';
  if (recentList) recentList.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">Loading...</div>';
  
  try {
    // 1. Fetch Overview Stats
    try {
        const overviewRes = await AdminAPI.getOverview();
        const { stats, recentPayments } = overviewRes.data;
        
        // Populate stats
        const statStudents = document.getElementById('stat-students');
        const statTeachers = document.getElementById('stat-teachers');
        const statCourses = document.getElementById('stat-courses');
        const statRevenue = document.getElementById('stat-revenue');
        
        if (statStudents) statStudents.textContent = stats.totalStudents.toLocaleString();
        if (statTeachers) statTeachers.textContent = stats.activeTeachers.toLocaleString();
        if (statCourses) statCourses.textContent = stats.activeCourses.toLocaleString();
        if (statRevenue) statRevenue.textContent = `₹${stats.totalRevenue.toLocaleString()}`;
        
        // Populate recent payments
        if (recentList) {
            if (!recentPayments || recentPayments.length === 0) {
                recentList.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">No recent payments.</div>';
            } else {
                recentList.innerHTML = recentPayments.map(p => `
                    <div class="flex items-center justify-between text-sm p-2 border-b border-gray-50 last:border-0">
                        <span class="text-gray-700">${p.student} – ${p.course}</span>
                        <span class="text-green-600 font-semibold">₹${p.amount}</span>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Failed to load overview stats", e);
    }

    // 2. Fetch pending teachers
    const res = await AdminAPI.getTeachers();
    const teachers = res.data.teachers || [];
    if (!teachers.length) { list.innerHTML = '<div class="text-center text-gray-400 py-4">No pending approvals.</div>'; return; }
    
    // show up to 3 in overview
    const displayTeachers = teachers.slice(0, 3);
    
    list.innerHTML = displayTeachers.map(t => {
      const tid = t.id || t._id;
      return `
        <div class="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
          <div class="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center text-yellow-700 font-bold text-sm">${t.name.charAt(0)}</div>
          <div class="flex-1"><div class="text-sm font-medium">${t.name}</div><div class="text-xs text-gray-500">Teacher • ${t.subject || 'N/A'}</div></div>
          <div class="flex gap-2">
            <button class="overview-approve-btn text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200" data-id="${tid}">Approve</button>
            <button class="overview-reject-btn text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold hover:bg-red-200" data-id="${tid}">Reject</button>
          </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.overview-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { 
            await AdminAPI.approveTeacher(btn.dataset.id); 
            showToast('Teacher approved! ✅', 'success'); 
            const container = btn.parentElement;
            container.innerHTML = '<span class="text-green-600 font-semibold text-sm bg-green-50 px-2 py-1 rounded">Approved</span>';
        }
        catch { showToast('Failed to approve.', 'error'); }
      });
    });
    document.querySelectorAll('.overview-reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { 
            await AdminAPI.rejectTeacher(btn.dataset.id); 
            showToast('Teacher rejected.', 'info'); 
            const container = btn.parentElement;
            container.innerHTML = '<span class="text-red-600 font-semibold text-sm bg-red-50 px-2 py-1 rounded">Rejected</span>';
        }
        catch { showToast('Failed to reject.', 'error'); }
      });
    });
  } catch { list.innerHTML = '<div class="text-center text-red-400 py-4">Failed to load.</div>'; }
}

// ─── Users ────────────────────────────────────────────
let allUsers = [];

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">Loading users...</td></tr>';
  try {
    const res   = await AdminAPI.getUsers();
    // Backend returns { users: [...] }, simulation returns same shape
    allUsers = res.data.users || (Array.isArray(res.data) ? res.data : []);
    renderUsers();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-red-400">Failed to load users.</td></tr>'; }
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('userSearch');
  const roleFilter = document.getElementById('userRoleFilter');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedRole = roleFilter ? roleFilter.value.toLowerCase() : 'all roles';

  const filteredUsers = allUsers.filter(u => {
    const nameMatch = u.name && u.name.toLowerCase().includes(searchTerm);
    const emailMatch = u.email && u.email.toLowerCase().includes(searchTerm);
    const matchesSearch = nameMatch || emailMatch;
    const matchesRole = selectedRole === 'all roles' || (u.role && u.role.toLowerCase() === selectedRole);
    return matchesSearch && matchesRole;
  });

  const statusColors = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-700' };
  
  if (filteredUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-500">No users found matching filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredUsers.map(u => {
    const joinedDate = u.joined || (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A');
    const status     = u.status || 'active';
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">${u.name ? u.name.charAt(0).toUpperCase() : '?'}</div>
            <div><div class="font-medium text-sm text-gray-900">${u.name || 'Unknown'}</div><div class="text-xs text-gray-400">${u.email || 'N/A'}</div></div>
          </div>
        </td>
        <td class="px-5 py-3 text-sm capitalize text-gray-600">${u.role || 'student'}</td>
        <td class="px-5 py-3"><span class="${statusColors[status] || 'bg-gray-100 text-gray-600'} text-xs px-2 py-0.5 rounded-full font-medium capitalize">${status}</span></td>
        <td class="px-5 py-3 text-sm text-gray-500">${joinedDate}</td>
        <td class="px-5 py-3">
          <div class="flex gap-2">
            <button class="text-xs text-blue-600 hover:underline font-medium view-user-btn" data-user='${JSON.stringify(u).replace(/'/g, "&#39;")}'>View</button>
            <button class="text-xs text-red-500 hover:underline font-medium delete-user-btn" data-id="${u._id || u.id}">Remove</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.view-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        const userStr = btn.getAttribute('data-user');
        const user = JSON.parse(userStr);
        showUserModal(user);
      } catch(e) { console.error('Error parsing user data', e); }
    });
  });

  document.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      try {
        await AdminAPI.deleteUser(btn.dataset.id);
        showToast('User deleted successfully.', 'success');
        loadUsers();
      } catch {
        showToast('Failed to delete user.', 'error');
      }
    });
  });
}

// ─── Courses ────────────────────────────────────────────
async function loadCourses() {
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400">Loading courses...</td></tr>';
  try {
    const res   = await AdminAPI.getCourses();
    const courses = res.data.courses || (Array.isArray(res.data) ? res.data : []);
    tbody.innerHTML = courses.map(c => {
      const createdDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A';
      const cid = c.id || c._id;
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-5 py-3">
            <div class="font-medium text-sm text-gray-900">${c.title}</div>
          </td>
          <td class="px-5 py-3 text-sm text-gray-600">${c.createdBy?.name || 'Unknown'}</td>
          <td class="px-5 py-3 text-sm text-gray-500">${createdDate}</td>
          <td class="px-5 py-3">
            <div class="flex gap-2">
              <button class="text-xs text-red-500 hover:underline font-medium delete-course-btn" data-id="${cid}">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.delete-course-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
          await AdminAPI.deleteCourse(btn.dataset.id);
          showToast('Course deleted successfully.', 'success');
          loadCourses();
        } catch {
          showToast('Failed to delete course.', 'error');
        }
      });
    });

  } catch { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-red-400">Failed to load courses.</td></tr>'; }
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
        try { 
            await AdminAPI.approveTeacher(btn.dataset.id); 
            showToast('Teacher approved! ✅', 'success'); 
            const container = btn.parentElement;
            container.innerHTML = '<span class="text-green-600 font-semibold px-4 py-2 bg-green-50 rounded-xl inline-block">Approved</span>';
        }
        catch { showToast('Failed to approve.', 'error'); }
      });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { 
            await AdminAPI.rejectTeacher(btn.dataset.id); 
            showToast('Teacher rejected.', 'info'); 
            const container = btn.parentElement;
            container.innerHTML = '<span class="text-red-600 font-semibold px-4 py-2 bg-red-50 rounded-xl inline-block">Rejected</span>';
        }
        catch { showToast('Failed to reject.', 'error'); }
      });
    });
  } catch { list.innerHTML = '<div class="text-center text-red-400 py-8">Failed to load.</div>'; }
}

// ─── Payments ─────────────────────────────────
async function loadPayments() {
  const tbody = document.getElementById('paymentsTableBody');
  const totalAmountEl = document.getElementById('totalPaymentsAmount');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Loading...</td></tr>';
  try {
    const res      = await AdminAPI.getPayments();
    const payments = res.data.payments || [];
    const totalAmount = res.data.totalAmount || 0;
    
    if (totalAmountEl) {
      totalAmountEl.textContent = `₹${totalAmount.toLocaleString()}`;
    }
    
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

// ─── Activity ─────────────────────────────────
async function loadActivity() {
  const chartContainer = document.getElementById('activityChart');
  const statsContainer = document.getElementById('contentStats');
  if (!chartContainer || !statsContainer) return;
  
  chartContainer.innerHTML = '<div class="text-center py-4 text-gray-400">Loading chart...</div>';
  statsContainer.innerHTML = '<div class="text-center py-4 text-gray-400">Loading stats...</div>';
  
  try {
    const res = await AdminAPI.getActivity();
    const { newUsers, contentStats } = res.data;
    
    // Render New Users Chart
    if (newUsers && newUsers.length > 0) {
      // Find max count for relative width scaling (ensure minimum scale of 1 to avoid division by zero)
      const maxCount = Math.max(...newUsers.map(u => u.count), 1);
      
      chartContainer.innerHTML = newUsers.map(u => {
        // Calculate percentage width (min 2% so the bar is at least barely visible)
        let percent = Math.max((u.count / maxCount) * 100, 2);
        if (u.count === 0) percent = 0; // if exactly zero, show nothing
        
        return `
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 w-10">${u.day}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-3">
              <div class="bg-blue-500 h-3 rounded-full transition-all duration-1000" style="width:${percent}%"></div>
            </div>
            <span class="text-xs font-semibold text-gray-600 w-8 text-right">${u.count}</span>
          </div>
        `;
      }).join('');
    } else {
      chartContainer.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No recent registration data.</div>';
    }

    // Render Content Stats
    if (contentStats) {
      statsContainer.innerHTML = `
        <div class="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
          <span class="text-sm text-gray-700">Total Videos Uploaded</span>
          <span class="font-bold text-blue-600">${contentStats.videosUploaded.toLocaleString()}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-green-50 rounded-xl">
          <span class="text-sm text-gray-700">Total Notes Available</span>
          <span class="font-bold text-green-600">${contentStats.notesUploaded.toLocaleString()}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
          <span class="text-sm text-gray-700">Total Quizzes Attempted</span>
          <span class="font-bold text-purple-600">${contentStats.quizzesAttempted.toLocaleString()}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
          <span class="text-sm text-gray-700">Doubts Solved By Teachers</span>
          <span class="font-bold text-orange-500">${contentStats.doubtsSolved.toLocaleString()}</span>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
    chartContainer.innerHTML = '<div class="text-center py-4 text-red-400">Failed to load data.</div>';
    statsContainer.innerHTML = '<div class="text-center py-4 text-red-400">Failed to load data.</div>';
  }
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showUserModal(user) {
  const modal = document.getElementById('userModal');
  if (!modal) return;
  
  document.getElementById('modalUserInitials').textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
  document.getElementById('modalUserName').textContent = user.name || 'Unknown';
  document.getElementById('modalUserEmail').textContent = user.email || 'N/A';
  document.getElementById('modalUserRole').textContent = user.role || 'student';
  document.getElementById('modalUserId').textContent = user._id || user.id || 'N/A';
  
  const status = user.status || 'active';
  const statusEl = document.getElementById('modalUserStatus');
  statusEl.textContent = status;
  statusEl.className = 'text-xs px-2 py-0.5 rounded-full font-medium capitalize ';
  const statusColors = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-700' };
  statusEl.className += (statusColors[status] || 'bg-gray-100 text-gray-600');
  
  document.getElementById('modalUserJoined').textContent = user.joined || (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A');
  
  modal.classList.remove('hidden');
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.add('hidden');
}
