/**
 * student.js – Student Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('student');
  loadUserInfo();
  initSidebar();
  initCart();
  initNotifications();
  initSection('overview');
  loadSection('overview');
});

// ─── Auth guard ───────────────────────────────
function requireAuth(expectedRole) {
  const user = getStoredUser();
  if (!user) { window.location.href = 'login.html'; return; }
  // Allow demo: if role matches
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
}

// ─── User info ────────────────────────────────
function loadUserInfo() {
  const user = getStoredUser() || { name: 'Student' };
  const initial = user.name.charAt(0).toUpperCase();
  document.getElementById('sidebarAvatar') && (document.getElementById('sidebarAvatar').textContent = initial);
  document.getElementById('sidebarName')   && (document.getElementById('sidebarName').textContent   = user.name);
  document.getElementById('greetName')     && (document.getElementById('greetName').textContent     = user.name.split(' ')[0]);
}

// ─── Sidebar navigation ───────────────────────
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
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      initSection(section);
      loadSection(section);
      // Close sidebar on mobile
      sidebar.classList.remove('open');
      overlay.classList.add('hidden');
    });
  });
}

// ─── Notifications ────────────────────────────
function initNotifications() {
  const btn = document.getElementById('notificationBtn');
  const panel = document.getElementById('notificationPanel');
  const markAllBtn = document.getElementById('markAllReadBtn');

  if (!btn || !panel) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      loadNotifications();
    }
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.add('hidden');
    }
  });

  markAllBtn && markAllBtn.addEventListener('click', async () => {
    try {
      await StudentAPI.markAllNotifRead();
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  });

  // Initial load to set badge
  loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notificationList');
  const badge = document.getElementById('notificationBadge');
  if (!list) return;

  try {
    const res = await StudentAPI.getNotifications();
    const notifs = res.data || [];
    let unreadCount = notifs.filter(n => !n.isRead).length;

    // --- DOUBT NOTIFICATIONS INJECTION ---
    let doubtNotifHtml = '';
    let unreadDoubts = 0;
    if (typeof myDoubts !== 'undefined' && myDoubts.length > 0) {
      const seenDoubts = JSON.parse(localStorage.getItem('seenDoubts') || '[]');
      const unreadDoubtList = myDoubts.filter(d => d.teacherReply && !seenDoubts.includes(d._id));
      unreadDoubts = unreadDoubtList.length;
      
      unreadDoubtList.forEach(d => {
        doubtNotifHtml += `<div class="p-4 hover:bg-gray-50 cursor-pointer transition flex gap-3 bg-blue-50/20" onclick="document.querySelector('[data-section=doubt]').click()">
            <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-green-100 text-green-600">
              💬
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-gray-900 mb-0.5">Teacher replied to your doubt</div>
              <div class="text-[11px] text-gray-500 leading-snug line-clamp-2">"${d.questionText}"</div>
              <div class="text-[9px] text-gray-400 font-medium mt-1 flex items-center justify-between">
                Just now
                <span class="w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
            </div>
          </div>`;
      });
    }

    unreadCount += unreadDoubts;

    // Update badge
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (!notifs.length && unreadDoubts === 0) {
      list.innerHTML = '<div class="p-8 text-center text-gray-400"><div class="text-3xl mb-2">🔔</div><div class="text-sm font-medium">No new notifications</div></div>';
      return;
    }

    // Combine Doubt Replies + System Notifications
    let sysNotifHtml = notifs.map(n => `
      <div class="p-4 hover:bg-gray-50 cursor-pointer transition flex gap-3 ${n.isRead ? 'opacity-60' : 'bg-blue-50/20'}" onclick="handleNotifClick('${n._id}', '${n.type}', '${n.courseId || ''}', '${(n.title || '').replace(/'/g, "\\'")}')">
        <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${n.type === 'VIDEO_UPLOAD' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}">
          ${n.type === 'VIDEO_UPLOAD' ? '🎥' : '✉️'}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-gray-900 mb-0.5">${n.title}</div>
          <div class="text-[11px] text-gray-500 leading-snug line-clamp-2">${n.message}</div>
          <div class="text-[9px] text-gray-400 font-medium mt-1 flex items-center justify-between">
            ${new Date(n.createdAt).toLocaleDateString()}
            ${!n.isRead ? '<span class="w-2 h-2 bg-blue-600 rounded-full"></span>' : ''}
          </div>
        </div>
      </div>
    `).join('');

    list.innerHTML = doubtNotifHtml + sysNotifHtml;

  } catch (err) {
    list.innerHTML = '<div class="p-4 text-center text-red-400 text-xs">Failed to load.</div>';
  }
}

async function handleNotifClick(id, type, courseId, title) {
  try {
    await StudentAPI.markNotifRead(id);
    loadNotifications();
    if (type === 'VIDEO_UPLOAD' && courseId) {
      openCoursePlayer(courseId, title || 'Course Content');
    } else if (type === 'VIDEO_UPLOAD') {
      initSection('my-courses');
      loadSection('my-courses');
    }
  } catch (err) {
    console.error('Failed to mark notification as read');
  }
}

function initSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`section-${name}`);
  if (el) el.classList.remove('hidden');
  const pageTitle = document.getElementById('pageTitle');
  const titles = { overview: 'Overview', classes: 'Courses', videos: 'Watch Videos', notes: 'Resources', quiz: 'Take Quiz', doubt: 'Ask Doubts', books: 'Book Request', cart: 'Your Cart', orders: 'Order History', 'my-courses': 'My Courses', 'course-player': 'Course Player' };
  if (pageTitle) pageTitle.textContent = titles[name] || name;
}

// ─── Load section data ────────────────────────
async function loadSection(name) {
  const loaders = {
    overview: loadOverview,
    classes: loadClasses,
    videos:  loadVideos,
    notes:   loadNotes,
    quiz:    loadQuizzes,
    books:   loadBooks,
    cart:    loadCart,
    orders:  loadOrders,
    'my-courses': loadMyCourses,
  };
  if (loaders[name]) await loaders[name]();
}

// ─── Overview ─────────────────────────────────
async function loadOverview() {
  try {
    // Fetch Data
    const enrolledRes = await StudentAPI.getEnrolledCourses();
    const enrolledCourses = Array.isArray(enrolledRes.data) ? enrolledRes.data : (enrolledRes.data.courses || []);
    
    // Stats: Enrolled Count
    const enrolledCountEl = document.getElementById('overviewEnrolledCount');
    if (enrolledCountEl) enrolledCountEl.textContent = enrolledCourses.length;

    // Stats: Videos Watched
    let completedVideos = {};
    try {
      completedVideos = JSON.parse(localStorage.getItem('completed_videos') || '{}');
    } catch (e) {}
    
    let totalWatched = 0;
    Object.values(completedVideos).forEach(videos => {
      if (Array.isArray(videos)) totalWatched += videos.length;
    });
    const videosCountEl = document.getElementById('overviewVideosCount');
    if (videosCountEl) videosCountEl.textContent = totalWatched;

    // Quizzes Taken & Avg Score (Simulated for now if no backend exists for student scores)
    // We can fetch getQuizzes to just show the count if we have quiz tracking
    let quizzesTakenCount = 0;
    let avgScore = 0;
    try {
      const storedScores = JSON.parse(localStorage.getItem('ll_quiz_scores') || '[]');
      quizzesTakenCount = storedScores.length;
      if (quizzesTakenCount > 0) {
        const totalPct = storedScores.reduce((sum, item) => sum + item.pct, 0);
        avgScore = Math.round(totalPct / quizzesTakenCount);
      }
    } catch (e) {}

    const quizCountEl = document.getElementById('overviewQuizCount');
    const avgScoreEl = document.getElementById('overviewAvgScore');
    if (quizCountEl) quizCountEl.textContent = quizzesTakenCount;
    if (avgScoreEl) avgScoreEl.textContent = quizzesTakenCount > 0 ? `${avgScore}%` : '-';

    // Continue Learning grid
    const grid = document.getElementById('overviewContinueLearningGrid');
    if (grid) {
      if (enrolledCourses.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-8">You are not enrolled in any courses yet.</div>';
      } else {
        const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600'];
        
        // Show up to 2 most recent courses
        const displayCourses = enrolledCourses.slice(0, 2);
        
        grid.innerHTML = displayCourses.map((c, i) => {
          const courseId = c._id || c.id;
          const initial = (c.title || c.name || '?').charAt(0).toUpperCase();
          const teacherName = c.createdBy ? (c.createdBy.name || 'Teacher') : 'Teacher';
          
          return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition">
              <div class="w-12 h-12 ${colors[i % colors.length]} rounded-xl flex items-center justify-center font-bold text-lg shrink-0">${initial}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-gray-900 truncate">${c.title || c.name}</div>
                <div class="text-xs text-gray-400 mt-0.5 truncate">Prof. ${teacherName}</div>
              </div>
              <button class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0 whitespace-nowrap" 
                      onclick="initSection('my-courses'); loadSection('my-courses'); setTimeout(() => openCoursePlayer('${courseId}', '${(c.title || c.name || '').replace(/'/g, "\\'")}'), 200);">
                Continue Course
              </button>
            </div>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Failed to load overview data', err);
  }
}

// ─── Classes ──────────────────────────────────
async function loadClasses() {
  const grid = document.getElementById('classesGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">Loading classes...</div>';
  try {
    const res = await StudentAPI.getClasses();
    const courses = Array.isArray(res.data) ? res.data : (res.data.classes || []);
    if (!courses.length) { grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">No classes found.</div>'; return; }
    const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600'];
    const enrolledRes = await StudentAPI.getEnrolledCourses();
    const enrolledCourses = Array.isArray(enrolledRes.data) ? enrolledRes.data : (enrolledRes.data.courses || []);
    const enrolledIds = enrolledCourses.map(ec => ec._id || ec.id);

    const cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
    grid.innerHTML = courses.map((c, i) => {
      const courseId = c._id || c.id;
      const isEnrolled = enrolledIds.includes(courseId);
      const inCart = cart.some(item => item.id === courseId);
      
      let btnHtml;
      if (isEnrolled) {
        btnHtml = `<button class="bg-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-lg font-bold cursor-default" disabled>Purchased</button>`;
      } else if (inCart) {
        btnHtml = `<button class="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold cursor-default">Added to Cart</button>`;
      } else {
        btnHtml = `<button class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition" onclick="addToCart('${courseId}', '${(c.title || c.name || '').replace(/'/g, "\\'")}', 499, this)">Add to Cart</button>`;
      }
      
      const cardStyle = isEnrolled ? 'style="filter: grayscale(1); opacity: 0.8;"' : '';
      
      return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow relative cursor-pointer group" ${cardStyle} onclick="openCourseIntro('${courseId}', '${(c.title || c.name || '').replace(/'/g, "\\'")}', '${(c.description || '').replace(/'/g, "\\'")}', '${c.createdBy ? (c.createdBy.name || 'Teacher') : 'Teacher'}', '${c.youtubePlaylistId || ''}', ${isEnrolled}, ${inCart})">
        <div class="flex items-center justify-between mb-4">
          <div class="w-11 h-11 ${colors[i % colors.length]} rounded-xl flex items-center justify-center font-bold text-lg">${(c.title || c.name || '?').charAt(0)}</div>
          <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Free</span>
          ${isEnrolled ? '<span class="absolute top-4 right-4 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Owned</span>' : ''}
        </div>
        <h3 class="font-semibold text-gray-900 text-sm mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">${c.title || c.name}</h3>
        <p class="text-xs text-gray-400 mb-3">👤 ${c.createdBy ? (c.createdBy.name || 'Teacher') : 'Teacher'}</p>
        <div class="text-xs text-gray-500 mb-3 line-clamp-2">${c.description || 'Quality education for future leaders.'}</div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400 font-bold">₹499</span>
          <div onclick="event.stopPropagation()">
            ${btnHtml}
          </div>
        </div>
      </div>`
    }).join('');
  } catch { grid.innerHTML = '<div class="col-span-3 text-center text-red-400 py-8">Failed to load classes.</div>'; }
}

async function enrollCourse(courseId) {
  if (!courseId || courseId === 'undefined') { showToast('Cannot enroll – no course ID.', 'error'); return; }
  try {
    await (api ? api.post(`/courses/${courseId}/enroll`) : Promise.resolve());
    showToast('Enrolled successfully! ✅', 'success');
    loadClasses();
  } catch (err) {
    showToast(err?.response?.data?.error || 'Failed to enroll.', 'error');
  }
}

// ─── Course Intro Modal ──────────────────────
async function openCourseIntro(courseId, title, desc, teacher, youtubePlaylistId, isEnrolled, inCart) {
  const modal = document.getElementById('courseIntroModal');
  if (!modal) return;
  
  document.getElementById('introCourseTitle').textContent = title;
  document.getElementById('introCourseTeacher').textContent = `By ${teacher}`;
  document.getElementById('introCourseDesc').textContent = desc || 'Quality education for future leaders.';
  
  const actionContainer = document.getElementById('introCourseAction');
  if (isEnrolled) {
    actionContainer.innerHTML = `<button class="bg-gray-200 text-gray-500 text-sm px-6 py-2.5 rounded-xl font-bold cursor-default" disabled>Purchased</button>`;
  } else if (inCart) {
    actionContainer.innerHTML = `<button class="bg-green-500 text-white text-sm px-6 py-2.5 rounded-xl font-semibold cursor-default" onclick="initSection('cart'); loadSection('cart'); closeCourseIntro();">Go to Cart</button>`;
  } else {
    actionContainer.innerHTML = `<button class="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200" onclick="addToCart('${courseId}', '${title.replace(/'/g, "\\'")}', 499, this); event.stopPropagation(); closeCourseIntro();">Add to Cart</button>`;
  }
  
  modal.classList.remove('hidden');
  
  const playlistContainer = document.getElementById('introCoursePlaylist');
  const countBadge = document.getElementById('introCourseCount');
  
  playlistContainer.innerHTML = '<div class="p-6 text-center text-gray-400 text-sm"><div class="animate-pulse flex items-center justify-center gap-2"><span>Loading curriculum...</span></div></div>';
  countBadge.textContent = '...';
  
  try {
    const res = await StudentAPI.getCourseVideos(courseId);
    const videos = Array.isArray(res.data) ? res.data : (res.data.videos || []);
    
    let playlistHtml = '';
    
    if (youtubePlaylistId) {
      const ytResult = parseYoutubeId(youtubePlaylistId);
      if (ytResult) {
        let embedSrc = '';
        if (ytResult.type === 'playlist') {
          embedSrc = `https://www.youtube.com/embed/videoseries?list=${ytResult.id}&controls=0&disablekb=1`;
        } else {
          embedSrc = `https://www.youtube.com/embed/${ytResult.id}?controls=0&disablekb=1`;
        }
        
        playlistHtml += `
          <div class="relative w-full aspect-video bg-black overflow-hidden group">
            <!-- Unplayable Overlay -->
            <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <div class="text-white text-sm font-bold tracking-wide uppercase">Enroll to Watch</div>
            </div>
            
            <iframe class="absolute inset-0 w-full h-full pointer-events-none opacity-80" 
                    src="${embedSrc}" 
                    frameborder="0">
            </iframe>
          </div>
          <div class="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs font-bold text-blue-800">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            YouTube Playlist Preview
          </div>
        `;
      }
    }
    
    if (videos.length === 0 && !youtubePlaylistId) {
      playlistHtml = '<div class="p-6 text-center text-gray-500 text-sm">Curriculum is being updated.</div>';
      countBadge.textContent = '0 LESSONS';
    } else if (videos.length > 0) {
      countBadge.textContent = `${videos.length} LESSONS`;
      playlistHtml += videos.map((v, i) => `
        <div class="flex items-center gap-3 p-3 hover:bg-gray-50 transition opacity-70">
          <div class="w-8 h-8 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs">
            ${String(i + 1).padStart(2, '0')}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-800 truncate">${v.title}</div>
            <div class="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Video Lesson
            </div>
          </div>
          <div class="text-gray-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
        </div>
      `).join('');
    } else if (youtubePlaylistId && videos.length === 0) {
       countBadge.textContent = 'PLAYLIST INCLUDED';
    }
    
    playlistContainer.innerHTML = playlistHtml;
    
  } catch (err) {
    playlistContainer.innerHTML = '<div class="p-6 text-center text-red-400 text-sm">Failed to load curriculum.</div>';
    countBadge.textContent = 'ERROR';
  }
}

function closeCourseIntro() {
  document.getElementById('courseIntroModal')?.classList.add('hidden');
}

// Close modal on click outside and escape key
document.addEventListener('click', (e) => {
  const modal = document.getElementById('courseIntroModal');
  const btn = document.getElementById('closeIntroModalBtn');
  
  if (btn && btn.contains(e.target)) {
    closeCourseIntro();
  }
  
  if (modal && e.target === modal) {
    closeCourseIntro();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCourseIntro();
});

// ─── My Courses ──────────────────────────────
async function loadMyCourses() {
  const grid = document.getElementById('myCoursesGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">Checking your enrollments...</div>';
  
  try {
    const res = await StudentAPI.getEnrolledCourses();
    const courses = Array.isArray(res.data) ? res.data : (res.data.courses || []);
    
    if (!courses.length) {
      grid.innerHTML = `
        <div class="col-span-3 text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
          <div class="text-5xl mb-4">🎓</div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">No courses yet</h3>
          <p class="text-gray-500 mb-6">Enroll in a course from the catalog to start learning.</p>
          <button onclick="initSection('classes'); loadSection('classes');" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition">Browse Catalog</button>
        </div>`;
      return;
    }

    const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-green-100 text-green-600', 'bg-orange-100 text-orange-600'];
    
    grid.innerHTML = courses.map((c, i) => `
      <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition duration-300">
        <div class="w-14 h-14 ${colors[i % colors.length]} rounded-2xl flex items-center justify-center font-black text-2xl mb-5 shadow-inner">
          ${(c.title || 'C').charAt(0)}
        </div>
        <h3 class="font-bold text-gray-900 text-lg mb-2 line-clamp-1">${c.title}</h3>
        <p class="text-xs text-gray-400 mb-6 flex items-center gap-2">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span> 
          Active Enrollment
        </p>
        <button onclick="openCoursePlayer('${c._id || c.id}', '${(c.title || '').replace(/'/g, "\\'")}', '${c.youtubePlaylistId || ''}')" class="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-blue-600 transition flex items-center justify-center gap-2">
          Study Now
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>
    `).join('');
    
  } catch (error) {
    grid.innerHTML = '<div class="col-span-3 text-center text-red-500 py-8">Failed to load courses.</div>';
  }
}

// ─── YouTube URL Converter ────────────────────
function parseYoutubeId(input) {
  if (!input || !input.trim()) return null;
  input = input.trim();
  try {
    if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('www.')) {
      const url = new URL(input.startsWith('www.') ? 'https://' + input : input);
      const hostname = url.hostname.replace('www.', '');

      if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        const listId = url.searchParams.get('list');
        const videoId = url.searchParams.get('v');
        if (listId) return { id: listId, type: 'playlist' };
        if (videoId) return { id: videoId, type: 'video' };
        const embedMatch = url.pathname.match(/^\/embed\/(.+)/);
        if (embedMatch) {
          if (url.pathname.includes('videoseries')) {
            return { id: url.searchParams.get('list'), type: 'playlist' };
          }
          return { id: embedMatch[1], type: 'video' };
        }
      }
      if (hostname === 'youtu.be') {
        const vid = url.pathname.slice(1);
        const listId = url.searchParams.get('list');
        if (listId) return { id: listId, type: 'playlist' };
        if (vid) return { id: vid, type: 'video' };
      }
      return null;
    }
    if (/^(PL|OL|UU|FL|RD|LL)[A-Za-z0-9_-]{10,}$/.test(input)) return { id: input, type: 'playlist' };
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return { id: input, type: 'video' };
    return null;
  } catch (e) {
    return null;
  }
}

// Global variables for YouTube API
let ytPlayer = null;
let ytIframeApiReady = false;
let ytPlaylistRendered = false;
let currentCourseIdForYt = null;

// Inject YouTube API only if not already loaded
if (window.YT && window.YT.Player) {
  ytIframeApiReady = true;
} else {
  const ytApiScript = document.createElement('script');
  ytApiScript.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag) {
      firstScriptTag.parentNode.insertBefore(ytApiScript, firstScriptTag);
  } else {
      document.head.appendChild(ytApiScript);
  }

  window.onYouTubeIframeAPIReady = function() {
    ytIframeApiReady = true;
  };
}

// ─── Course Player ────────────────────────────
let currentCourseVideos = [];

async function openCoursePlayer(courseId, courseTitle, youtubePlaylistId) {
  initSection('course-player');
  const playlist = document.getElementById('coursePlaylist');
  const titleEl = document.getElementById('currentPlayerCourseTitle');
  const countEl = document.getElementById('playlistCount');
  
  if (titleEl) titleEl.textContent = courseTitle;
  if (playlist) playlist.innerHTML = '<div class="p-6 text-center text-gray-400">Loading playlist...</div>';
  
  // UI Elements
  const player = document.getElementById('courseVideoPlayer');
  const ytContainer = document.getElementById('youtubePlaylistContainer');
  const ytIframe = document.getElementById('youtubePlaylistIframe');
  const placeholder = document.getElementById('videoPlaceholder');

  // Reset UI
  if (player) { player.pause(); player.src = ''; player.classList.remove('hidden'); }
  if (ytContainer) ytContainer.classList.add('hidden');
  if (placeholder) {
    placeholder.classList.remove('hidden');
    placeholder.querySelector('h3').textContent = "Select a video to start learning";
  }

  try {
    const res = await StudentAPI.getCourseVideos(courseId);
    currentCourseVideos = Array.isArray(res.data) ? res.data : (res.data.videos || []);
    
    if (youtubePlaylistId) {
      const ytResult = parseYoutubeId(youtubePlaylistId);

      if (ytResult) {
        // Valid YouTube link — show embed
        if (player) player.classList.add('hidden');
        if (ytContainer) ytContainer.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        ytPlaylistRendered = false;
        currentCourseIdForYt = courseId;
        
        const renderYtPlayer = () => {
          if (ytPlayer && typeof ytPlayer.destroy === 'function') {
            try { ytPlayer.destroy(); } catch (e) {}
          }
          
          ytContainer.innerHTML = '<div id="youtubePlaylistIframe" class="w-full h-full"></div>';
          
          const playerVars = { autoplay: 0, rel: 0, enablejsapi: 1 };
          if (ytResult.type === 'playlist') {
            playerVars.listType = 'playlist';
            playerVars.list = ytResult.id;
          }
          
          const playerOptions = {
            height: '100%',
            width: '100%',
            playerVars: playerVars,
            events: {
              'onReady': (event) => {
                const tryRender = () => {
                  if (ytPlaylistRendered) return;
                  if (ytResult.type === 'video') {
                    renderYtPlaylist([ytResult.id], courseId);
                    return;
                  }
                  if (event.target && typeof event.target.getPlaylist === 'function') {
                    const pl = event.target.getPlaylist();
                    if (pl && pl.length > 0) {
                      renderYtPlaylist(pl, courseId);
                    }
                  }
                };
                setTimeout(tryRender, 1000);
                setTimeout(tryRender, 3000); // Retry in case playlist data is slow
              },
              'onStateChange': (event) => {
                if (ytPlaylistRendered) return;
                if (ytResult.type === 'video') {
                  renderYtPlaylist([ytResult.id], courseId);
                  return;
                }
                if (event.target && typeof event.target.getPlaylist === 'function') {
                  const pl = event.target.getPlaylist();
                  if (pl && pl.length > 0) {
                    renderYtPlaylist(pl, courseId);
                  }
                }
              }
            }
          };
          
          if (ytResult.type === 'video') {
            playerOptions.videoId = ytResult.id;
          }
          
          ytPlayer = new YT.Player('youtubePlaylistIframe', playerOptions);
        };

        if (window.YT && window.YT.Player) {
          renderYtPlayer();
        } else {
          const interval = setInterval(() => {
            if (window.YT && window.YT.Player) {
              clearInterval(interval);
              renderYtPlayer();
            }
          }, 100);
        }

        if (playlist) {
          playlist.innerHTML = '<div class="p-6 text-center text-gray-400 text-sm"><div class="animate-pulse">Loading YouTube Content...</div></div>';
        }
      } else {
        // Invalid YouTube link — show fallback
        if (player) player.classList.add('hidden');
        if (ytContainer) ytContainer.classList.add('hidden');
        if (placeholder) {
          placeholder.classList.remove('hidden');
          placeholder.innerHTML = `
            <div class="text-5xl mb-4">⚠️</div>
            <h3 class="text-xl font-bold mb-2">Invalid video link</h3>
            <p class="text-gray-400 text-sm max-w-md">The YouTube link for this course could not be loaded. Please contact the instructor.</p>
          `;
        }
        if (playlist) {
          playlist.innerHTML = `
            <div class="p-6 bg-red-50 border-b border-red-100">
              <div class="text-red-600 font-bold text-sm mb-1 flex items-center gap-2">
                ⚠️ Invalid Link
              </div>
              <p class="text-red-400 text-[10px]">The provided YouTube URL could not be parsed.</p>
            </div>
          `;
        }
      }
    }

    if (countEl && !youtubePlaylistId) countEl.textContent = `${currentCourseVideos.length} LESSONS`;
    
    if (!currentCourseVideos.length && !youtubePlaylistId) {
      if (playlist) playlist.innerHTML = '<div class="p-8 text-center text-gray-400"><div class="text-3xl mb-2">📭</div><div class="text-sm font-bold">No videos yet</div><p class="text-[10px] mt-1">Check back later for updates.</p></div>';
      
      if (placeholder) {
        placeholder.innerHTML = `
          <div class="text-4xl mb-4">🎬</div>
          <h3 class="text-xl font-bold mb-2">No videos available for this course yet</h3>
          <p class="text-gray-400 text-sm max-w-md">The instructor hasn't uploaded any modules or linked a playlist yet.</p>
        `;
      }
      return;
    }

    let completedVideos = {};
    try {
      completedVideos = JSON.parse(localStorage.getItem('completed_videos') || '{}');
    } catch (e) {
      completedVideos = {};
    }
    
    const videoItems = currentCourseVideos.map((v, i) => {
      const vid = v._id || `custom_${i}`;
      const isCompleted = completedVideos[courseId] && completedVideos[courseId].includes(vid);
      return `
      <div class="playlist-item group p-4 hover:bg-blue-50 cursor-pointer transition flex flex-col gap-2" data-index="${i}" data-vid="${vid}">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-600 transition">
            ${String(i + 1).padStart(2, '0')}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700 transition">${v.title}</div>
            <div class="text-[10px] text-gray-400 font-medium">Video • Lesson ${i+1}</div>
          </div>
          <div class="completion-check text-green-500 ${isCompleted ? '' : 'hidden'}">
             <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
          </div>
        </div>
        <button class="mark-completed-btn mt-2 bg-white border border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-600 hover:text-green-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition self-start flex items-center gap-1 shadow-sm ${isCompleted ? 'hidden' : ''}">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          Mark as Completed
        </button>
      </div>
      `;
    }).join('');

    if (playlist && !youtubePlaylistId) {
      playlist.innerHTML = videoItems;
    }

    // Attach playlist clicks for internal videos
    if (!youtubePlaylistId) {
      document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.mark-completed-btn')) {
            e.stopPropagation();
            const vid = item.dataset.vid;
            
            let completed = {};
            try {
              completed = JSON.parse(localStorage.getItem('completed_videos') || '{}');
            } catch (e) {}
            if (!completed[courseId]) completed[courseId] = [];
            if (!completed[courseId].includes(vid)) {
              completed[courseId].push(vid);
              localStorage.setItem('completed_videos', JSON.stringify(completed));
            }
            
            item.querySelector('.completion-check').classList.remove('hidden');
            item.querySelector('.mark-completed-btn').classList.add('hidden');
            return;
          }

          const idx = item.dataset.index;
          playVideoAtIndex(idx);
          
          document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-600'));
          item.classList.add('bg-blue-50', 'border-l-4', 'border-blue-600');
        });
      });
    }

  } catch (error) {
    if (playlist && !youtubePlaylistId) playlist.innerHTML = '<div class="p-6 text-center text-red-400 text-xs font-bold">Failed to load playlist.</div>';
  }
}

function renderYtPlaylist(pl, courseId) {
  if (ytPlaylistRendered) return;
  ytPlaylistRendered = true;
  
  const countEl = document.getElementById('playlistCount');
  if (countEl) countEl.textContent = `${pl.length} LESSONS`;
  
  const playlist = document.getElementById('coursePlaylist');
  if (playlist) {
    let completedVideos = {};
    try {
      completedVideos = JSON.parse(localStorage.getItem('completed_videos') || '{}');
    } catch (e) {
      completedVideos = {};
    }
    
    const items = pl.map((vid, i) => {
      const isCompleted = completedVideos[courseId] && completedVideos[courseId].includes(vid);
      return `
        <div class="playlist-item group p-4 hover:bg-blue-50 cursor-pointer transition flex flex-col gap-2" data-index="${i}" data-vid="${vid}">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-600 transition">
              ${String(i + 1).padStart(2, '0')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700 transition">Lesson ${i + 1}</div>
              <div class="text-[10px] text-gray-400 font-medium">Video</div>
            </div>
            <div class="completion-check text-green-500 ${isCompleted ? '' : 'hidden'}">
               <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            </div>
          </div>
          <button class="mark-completed-btn mt-2 bg-white border border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-600 hover:text-green-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition self-start flex items-center gap-1 shadow-sm ${isCompleted ? 'hidden' : ''}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Mark as Completed
          </button>
        </div>
      `;
    }).join('');
    
    playlist.innerHTML = `
      <div class="p-4 bg-blue-50 border-b border-blue-100">
        <div class="text-blue-700 font-bold text-sm mb-1 flex items-center gap-2">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          YouTube Playlist
        </div>
      </div>
      ${items}
    `;
    
    // Attach clicks
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.mark-completed-btn')) {
          e.stopPropagation();
          const vid = item.dataset.vid;
          
          let completed = {};
          try {
            completed = JSON.parse(localStorage.getItem('completed_videos') || '{}');
          } catch (e) {}
          if (!completed[courseId]) completed[courseId] = [];
          if (!completed[courseId].includes(vid)) {
            completed[courseId].push(vid);
            localStorage.setItem('completed_videos', JSON.stringify(completed));
          }
          
          item.querySelector('.completion-check').classList.remove('hidden');
          item.querySelector('.mark-completed-btn').classList.add('hidden');
          return;
        }
        
        const idx = parseInt(item.dataset.index);
        if (ytPlayer && typeof ytPlayer.playVideoAt === 'function') {
          ytPlayer.playVideoAt(idx);
        }
        
        document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-600'));
        item.classList.add('bg-blue-50', 'border-l-4', 'border-blue-600');
      });
    });
  }
}

function playVideoAtIndex(index) {
  const video = currentCourseVideos[index];
  if (!video) return;

  const player = document.getElementById('courseVideoPlayer');
  const ytContainer = document.getElementById('youtubePlaylistContainer');
  const placeholder = document.getElementById('videoPlaceholder');
  const title = document.getElementById('currentVideoTitle');
  const desc = document.getElementById('currentVideoDesc');

  // Switch to standard player
  if (ytContainer) ytContainer.classList.add('hidden');
  if (player) player.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');

  if (title) title.textContent = video.title;
  if (desc) desc.textContent = video.description || 'No description available for this lesson.';

  const fileUrl = video.filePath ? `http://localhost:5000/${video.filePath.replace(/\\/g, '/')}` : '';
  if (fileUrl && player) {
    player.src = fileUrl;
    player.play();
  } else {
    // Show placeholder for missing video file (common in demo)
    player.pause();
    player.src = '';
    placeholder.classList.remove('hidden');
    placeholder.querySelector('h3').textContent = "Video File Missing";
    placeholder.querySelector('p').textContent = "This is a placeholder for a real video file. Once YouTube API is integrated, it will appear here.";
  }
}

// ─── Videos ───────────────────────────────────
async function loadVideos() {
  const grid = document.getElementById('videosGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">Loading videos...</div>';
  try {
    const res    = await StudentAPI.getVideos();
    const videos = Array.isArray(res.data) ? res.data : (res.data.videos || []);
    if (!videos.length) { grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">No videos found.</div>'; return; }
    const subjects = ['💾', '⚛️', '🧪', '📖', '🌊', '📝'];
    grid.innerHTML = videos.map((v, i) => {
      const fileUrl = v.filePath ? `http://localhost:5000/${v.filePath.replace(/\\/g, '/')}` : '';
      return `
        <div class="video-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer" data-id="${v._id || v.id}" data-title="${v.title}" data-url="${fileUrl}">
          <div class="bg-gray-900 aspect-video flex items-center justify-center text-5xl">${subjects[i % subjects.length]}</div>
          <div class="p-4">
            <h3 class="font-semibold text-sm text-gray-900 mb-1">${v.title}</h3>
            <p class="text-xs text-gray-500 mb-2">${v.description || ''} • ${v.uploadedBy ? v.uploadedBy.name : 'Teacher'}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">${v.courseId ? (v.courseId.title || '') : ''}</span>
              <button class="play-video-btn bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition">▶ Play</button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Attach play events
    document.querySelectorAll('.play-video-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card  = btn.closest('[data-id]');
        openVideoModal(card.dataset.title, card.dataset.url);
      });
    });

    // Modal close
    document.getElementById('closeVideoModal') && document.getElementById('closeVideoModal').addEventListener('click', closeVideoModal);
  } catch { grid.innerHTML = '<div class="col-span-3 text-center text-red-400 py-8">Failed to load videos.</div>'; }
}

function openVideoModal(title, url) {
  const modal  = document.getElementById('videoModal');
  const player = document.getElementById('videoPlayer');
  document.getElementById('videoTitle').textContent = title;
  if (url) player.src = url;
  modal.classList.remove('hidden');
}
function closeVideoModal() {
  const modal  = document.getElementById('videoModal');
  const player = document.getElementById('videoPlayer');
  player.pause();
  player.src = '';
  modal.classList.add('hidden');
}

// ─── Notes ────────────────────────────────────
async function loadNotes() {
  const list = document.getElementById('notesList');
  if (!list) return;
  list.innerHTML = '<div class="p-6 text-center text-gray-400">Loading notes...</div>';
  try {
    const res   = await StudentAPI.getNotes();
    const notes = Array.isArray(res.data) ? res.data : (res.data.notes || []);
    if (!notes.length) { list.innerHTML = '<div class="p-6 text-center text-gray-400">No notes uploaded yet.</div>'; return; }
    const ext = name => (name || '').split('.').pop().toLowerCase();
    const typeIcon = { pdf: '📕', docx: '📘', doc: '📘', pptx: '📊', xlsx: '📊' };
    list.innerHTML = notes.map(n => {
      const filename = n.originalName || n.title || 'file';
      const fileUrl  = n.filePath ? `http://localhost:5000/${n.filePath.replace(/\\/g, '/')}` : '#';
      const dateStr  = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
      return `
        <div class="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
          <div class="text-2xl">${typeIcon[ext(filename)] || '📄'}</div>
          <div class="flex-1">
            <div class="font-medium text-sm text-gray-900">${n.title}</div>
            <div class="text-xs text-gray-400 mt-0.5">${n.uploadedBy ? n.uploadedBy.name : 'Teacher'} • ${n.courseId ? (n.courseId.title || '') : ''}</div>
          </div>
          <div class="text-xs text-gray-400">${dateStr}</div>
          <a href="${fileUrl}" target="_blank" class="bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition">⬇ Download</a>
        </div>`;
    }).join('');
  } catch { list.innerHTML = '<div class="p-6 text-center text-red-400">Failed to load notes.</div>'; }
}

// ─── Quizzes ──────────────────────────────────
async function loadQuizzes() {
  const selector  = document.getElementById('quizSelector');
  if (!selector) return;
  selector.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">Loading quizzes...</div>';
  try {
    const res     = await StudentAPI.getQuizzes();
    const quizzes = Array.isArray(res.data) ? res.data : (res.data.quizzes || []);
    if (!quizzes.length) { selector.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">No quizzes available yet.</div>'; return; }
    selector.innerHTML = quizzes.map(q => `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition" data-quiz-id="${q._id || q.id}">
        <div class="text-3xl mb-3">📝</div>
        <h3 class="font-semibold text-sm text-gray-900 mb-1">${q.title}</h3>
        <p class="text-xs text-gray-500 mb-3">${q.courseId ? (q.courseId.title || '') : ''} • ${(q.questions || []).length} Questions</p>
        <button class="start-quiz-btn w-full bg-blue-600 text-white text-xs py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Start Quiz</button>
      </div>`).join('');

    // Attach start events
    document.querySelectorAll('.start-quiz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card   = btn.closest('[data-quiz-id]');
        const quizId = card.dataset.quizId;
        const quiz   = quizzes.find(q => (q._id || q.id) === quizId || (q._id || q.id) == quizId);
        if (quiz) startQuiz(quiz);
      });
    });
  } catch { selector.innerHTML = '<div class="col-span-3 text-center text-red-400 py-8">Failed to load quizzes.</div>'; }
}

async function startQuiz(quiz) {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth' });

  // Fetch full quiz data (with correctAnswer) from the /take endpoint
  let fullQuiz = quiz;
  try {
    const quizId = quiz._id || quiz.id;
    const res = await StudentAPI.getQuizForTaking(quizId);
    if (res && res.data) fullQuiz = res.data;
  } catch (e) {
    console.warn('Could not fetch full quiz, using listing data', e);
  }

  // Normalize questions to a common shape regardless of backend vs simulation
  const questionList = (fullQuiz.questions || fullQuiz.questions_data || []).map(q => ({
    text:    q.questionText || q.q || '',
    options: q.options || [],
    // correctAnswer is the actual option string; find its index
    correct: typeof q.answer === 'number' ? q.answer :
             (q.options || []).findIndex(opt => opt === q.correctAnswer),
  }));

  let currentQ = 0;
  let score    = 0;
  let answered = false;

  function renderQuestion() {
    const q = questionList[currentQ];
    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="font-bold text-gray-900">${quiz.title}</h3>
          <p class="text-xs text-gray-500 mt-0.5">Question ${currentQ + 1} of ${questionList.length}</p>
        </div>
        <div class="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Score: ${score}</div>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2 mb-6"><div class="bg-blue-500 h-2 rounded-full transition-all" style="width:${(currentQ / questionList.length) * 100}%"></div></div>
      <p class="font-semibold text-gray-900 mb-5">${q.text}</p>
      <div class="space-y-3" id="optionsContainer">
        ${q.options.map((opt, i) => `<div class="quiz-option" data-index="${i}">${opt}</div>`).join('')}
      </div>
      <div class="mt-6 flex gap-3">
        <button id="nextBtn" class="hidden flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
          ${currentQ < questionList.length - 1 ? 'Next Question →' : 'See Results'}
        </button>
      </div>`;

    document.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const selected = parseInt(opt.dataset.index);
        if (selected === q.correct) score++;

        document.querySelectorAll('.quiz-option').forEach((o, i) => {
          if (i === q.correct) o.classList.add('correct');
          else if (i === selected && selected !== q.correct) o.classList.add('incorrect');
        });
        document.getElementById('nextBtn').classList.remove('hidden');
      });
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      currentQ++;
      answered = false;
      if (currentQ < questionList.length) { renderQuestion(); }
      else { showResults(); }
    });
  }

  function showResults() {
    const pct = questionList.length ? Math.round((score / questionList.length) * 100) : 0;
    
    // Save quiz score to localStorage for Overview stats
    try {
      const storedScores = JSON.parse(localStorage.getItem('ll_quiz_scores') || '[]');
      storedScores.push({ quizId: quiz._id || quiz.id, pct, score, total: questionList.length });
      localStorage.setItem('ll_quiz_scores', JSON.stringify(storedScores));
    } catch (e) {}

    const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-500' : 'text-red-500';
    container.innerHTML = `
      <div class="text-center py-6">
        <div class="text-6xl mb-4">${pct >= 70 ? '🏆' : pct >= 40 ? '📚' : '💪'}</div>
        <h3 class="font-bold text-xl text-gray-900 mb-2">Quiz Complete!</h3>
        <div class="text-5xl font-bold ${color} mb-2">${pct}%</div>
        <p class="text-gray-500 text-sm mb-6">You scored ${score} out of ${questionList.length}</p>
        <button id="retakeQuiz" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">Retake Quiz</button>
      </div>`;
    document.getElementById('retakeQuiz').addEventListener('click', () => { currentQ = 0; score = 0; answered = false; renderQuestion(); });
  }

  renderQuestion();
}

// ─── Order History ────────────────────────────
async function loadOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  
  container.innerHTML = '<div class="text-center text-gray-400 py-8">Loading order history...</div>';
  
  try {
    const res = await PaymentAPI.getOrders();
    const orders = res.data.orders || [];
    
    if (orders.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-12"><div class="text-4xl mb-3">📦</div><h3 class="text-xl font-bold text-gray-900 mb-2">No orders yet</h3><p class="text-sm">You haven\'t purchased any courses yet.</p></div>';
      return;
    }
    
    container.innerHTML = orders.map(order => {
      const dateStr = new Date(order.createdAt).toLocaleDateString();
      const statusColor = order.status === 'success' ? 'bg-green-100 text-green-700' : (order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700');
      const statusIcon = order.status === 'success' ? '✅' : (order.status === 'pending' ? '⏳' : '❌');
      
      return `
        <div class="border border-gray-100 rounded-xl p-5 hover:border-blue-100 hover:shadow-md transition bg-gray-50/50">
          <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <div class="text-xs text-gray-400 mb-1 font-mono">ID: ${order.orderId}</div>
              <h3 class="font-bold text-lg text-gray-900">${order.courseName}</h3>
              <p class="text-sm text-gray-500 mt-1">Date: ${dateStr}</p>
            </div>
            <div class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 md:gap-1">
              <div class="font-black text-xl text-blue-600">₹${order.amount}</div>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}">${statusIcon} ${order.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading orders:', error);
    container.innerHTML = '<div class="text-center text-red-500 py-8 bg-red-50 rounded-xl border border-red-100">Failed to load order history. Please try again.</div>';
  }
}


// ─── Books ────────────────────────────────────
async function loadBooks() {
  const list = document.getElementById('recommendedBooksList');
  if (!list) return;
  try {
    const res   = await StudentAPI.getRecommendedBooks();
    // Backend returns array of recommendations directly
    const books = Array.isArray(res.data) ? res.data : (res.data.books || []);
    if (!books.length) {
      list.innerHTML = '<p class="text-xs text-gray-400">No recommendations from teachers yet.</p>';
    } else {
      list.innerHTML = books.map(b => `
        <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <span class="text-2xl">📚</span>
          <div>
            <div class="font-bold text-[13px] text-gray-900 leading-tight">${b.title}</div>
            <div class="text-[11px] text-gray-500 mt-0.5">${b.author} • ${b.subject}</div>
            <div class="text-[10px] text-blue-600 font-semibold mt-1">Recommended by ${b.recommendedBy ? b.recommendedBy.name : 'Teacher'}</div>
          </div>
        </div>`).join('');
    }
  } catch { list.innerHTML = '<p class="text-sm text-gray-400 font-medium">Failed to load recommended books.</p>'; }

  loadMyBookRequests();

  // Book request form
  const form = document.getElementById('bookRequestForm');
  if (form && !form.dataset.init) {
    form.dataset.init = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        title:   document.getElementById('bookTitle').value,
        subject: document.getElementById('bookSubject').value,
        reason:  document.getElementById('bookReason').value,
      };
      if (!data.title || !data.subject) { showToast('Please fill in required fields.', 'error'); return; }
      try {
        await StudentAPI.requestBook(data);
        showToast('Book request submitted! ✅', 'success');
        form.reset();
        loadMyBookRequests();
      } catch { showToast('Failed to submit request.', 'error'); }
    });
  }
}

async function loadMyBookRequests() {
  const list = document.getElementById('myBookRequestsList');
  if (!list) return;
  try {
    const res = await StudentAPI.getMyBookRequests();
    const requests = res.data || [];
    if (!requests.length) {
      list.innerHTML = '<p class="text-[11px] text-gray-400">You haven\'t requested any books yet.</p>';
      return;
    }
    list.innerHTML = requests.map(r => {
      const statusClass = r.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                         r.status === 'fulfilled' ? 'bg-green-100 text-green-700 border-green-200' : 
                         'bg-red-100 text-red-700 border-red-200';
      return `
        <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-bold text-gray-900 truncate">${r.bookName}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">${new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          <span class="text-[9px] uppercase font-bold px-2 py-1 rounded-lg border ${statusClass}">${r.status}</span>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<p class="text-[11px] text-red-400">Failed to load your requests.</p>';
  }
}

// ─── Doubt chat (inline) ─────────────────────
let myDoubts = [];

async function loadDoubtHistory() {
  const messages = document.getElementById('doubtChatMessages');
  if (!messages) return;

  try {
    const res = await ChatbotAPI.getMyDoubts();
    myDoubts = res.data;
    messages.innerHTML = '';
    
    let unreadReplies = 0;

    myDoubts.forEach(doubt => {
      // Student's message bubble (right)
      messages.innerHTML += `<div class="flex justify-end"><div class="bg-blue-600 text-white rounded-xl rounded-br-none p-3 text-sm max-w-xs shadow-sm">${doubt.questionText}</div></div>`;
      
      // Teacher's reply bubble (left), if it exists
      if (doubt.teacherReply) {
        messages.innerHTML += `<div class="flex gap-3 mt-2 mb-6"><div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0 shadow-sm">T</div><div class="bg-blue-50 rounded-xl rounded-tl-none p-3 text-sm text-gray-700 max-w-xs border border-blue-100 shadow-sm"><div class="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wide">${doubt.repliedBy?.name || 'Teacher'}</div>${doubt.teacherReply}</div></div>`;
        
        const seenDoubts = JSON.parse(localStorage.getItem('seenDoubts') || '[]');
        if (!seenDoubts.includes(doubt._id)) {
          unreadReplies++;
        }
      } else {
        messages.innerHTML += `<div class="mb-4"></div>`;
      }
    });

    // Only scroll to bottom if we are actively viewing the chat, or if it's the first load
    if (document.getElementById('section-doubt').classList.contains('hidden') === false) {
       messages.scrollTop = messages.scrollHeight;
    }

    loadNotifications();

  } catch (err) {
    console.error("Failed to load doubt history:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn  = document.getElementById('sendDoubt');
  const input    = document.getElementById('doubtInput');
  const messages = document.getElementById('doubtChatMessages');

  // Load history on start and poll every 10 seconds
  loadDoubtHistory();
  setInterval(loadDoubtHistory, 10000);

  // Mark as read when clicking the Doubt section
  document.querySelector('[data-section="doubt"]')?.addEventListener('click', () => {
     if (myDoubts.length > 0) {
         const repliedIds = myDoubts.filter(d => d.teacherReply).map(d => d._id);
         const seenDoubts = JSON.parse(localStorage.getItem('seenDoubts') || '[]');
         const newSeen = [...new Set([...seenDoubts, ...repliedIds])];
         localStorage.setItem('seenDoubts', JSON.stringify(newSeen));
         loadNotifications(); // Refresh notifications dropdown
         setTimeout(() => {
           if (messages) messages.scrollTop = messages.scrollHeight;
         }, 100);
     }
  });

  sendBtn && sendBtn.addEventListener('click', sendDoubt);
  input   && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDoubt(); });

  async function sendDoubt() {
    const msg = input?.value.trim();
    if (!msg || !messages) return;
    input.value = '';

    messages.innerHTML += `<div class="flex justify-end"><div class="bg-blue-600 text-white rounded-xl rounded-br-none p-3 text-sm max-w-xs shadow-sm">${msg}</div></div><div class="mb-4"></div>`;
    messages.scrollTop = messages.scrollHeight;

    try {
      await ChatbotAPI.askDoubt(msg);
      await loadDoubtHistory(); // Reload to sync with DB
    } catch {
      messages.innerHTML += `<div class="text-xs text-red-400 text-center mb-4">Failed to send doubt. Please try again.</div>`;
    }
  }
});

// ─── Cart & Checkout (Razorpay) ────────────────
function initCart() {
  const toggleBtn = document.querySelector('.cart-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      initSection('cart');
      loadCart();
    });
  }

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkoutCart);
  }
  
  updateCartBadge();
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = cart.length;
    badge.style.display = cart.length > 0 ? 'flex' : 'none';
  }
}

function addToCart(courseId, title, price, btnElement = null) {
  let cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
  if (cart.find(item => item.id === courseId)) {
    showToast('Course already in cart.', 'info');
    return;
  }
  cart.push({ id: courseId, title, price });
  localStorage.setItem('ll_cart', JSON.stringify(cart));
  updateCartBadge();
  showToast(title + ' added to cart! 🛒', 'success');
  
  if (btnElement) {
    btnElement.textContent = "Added to Cart";
    btnElement.className = "bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold";
  }
}

function removeFromCart(courseId) {
  let cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
  cart = cart.filter(item => item.id !== courseId);
  localStorage.setItem('ll_cart', JSON.stringify(cart));
  updateCartBadge();
  loadCart(); // Refresh UI if open
  
  // Refresh classes view if it is open, so buttons switch back to blue
  const classesSection = document.getElementById('section-classes');
  if (classesSection && !classesSection.classList.contains('hidden')) {
    loadClasses();
  }
}

function loadCart() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  if (!container) return;
  
  const cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
  
  if (cart.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500">Your cart is empty. <br/><button onclick="initSection('classes'); loadClasses();" class="mt-4 text-blue-600 font-semibold hover:underline">Browse Classes</button></div>`;
    subtotalEl.textContent = '₹0';
    totalEl.textContent = '₹0';
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
    return;
  }
  
  checkoutBtn.disabled = false;
  checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  
  let total = 0;
  container.innerHTML = cart.map(item => {
    total += item.price;
    return `
      <div class="flex items-center justify-between p-5 hover:bg-gray-50 transition">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl text-xl font-bold">🛒</div>
          <div>
            <h4 class="font-semibold text-gray-900">${item.title}</h4>
            <div class="text-sm text-gray-500 mt-1">Course Access</div>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <span class="font-bold text-gray-900">₹${item.price}</span>
          <button onclick="removeFromCart('${item.id}')" class="text-red-500 hover:text-red-700 bg-red-50 w-8 h-8 rounded-full flex items-center justify-center transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  subtotalEl.textContent = '₹' + total;
  totalEl.textContent = '₹' + total;
}

async function checkoutCart() {
  const cart = JSON.parse(localStorage.getItem('ll_cart')) || [];
  if (cart.length === 0) return;

  const btn = document.getElementById('checkoutBtn');
  btn.innerHTML = 'Processing... <span class="animate-spin ml-2">⏳</span>';
  btn.disabled = true;

  try {
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
    const courseNames = cart.map(item => item.title).join(', ');
    
    // We can just use the first course id to satisfy backend requirement
    const reqBody = {
      courseId: cart[0].id,
      courseName: courseNames.length > 50 ? courseNames.substring(0, 47) + '...' : courseNames,
      amount: totalAmount,
      paymentMethod: 'razorpay'
    };

    // Calling the unified API
    const res = await api.post('/payment/create-order', reqBody);
    const orderData = res.data;

    // Simulated Checkout Flow (Test Mode)
    const simModal = document.getElementById('simulatedPaymentModal');
    const rzpLoader = document.getElementById('razorpayLoader');
    if (simModal) {
      if (rzpLoader) {
        rzpLoader.classList.remove('hidden');
        setTimeout(() => rzpLoader.classList.remove('opacity-0'), 10);
      }
      
      document.getElementById('simulatedAmountDisplay').textContent = '₹' + totalAmount;
      
      setTimeout(() => {
        if (rzpLoader) {
          rzpLoader.classList.add('opacity-0');
          setTimeout(() => rzpLoader.classList.add('hidden'), 300);
        }
        simModal.classList.remove('hidden');
      }, 1500);

      const succBtn = document.getElementById('simulatedPaySuccessBtn');
      const failBtn = document.getElementById('simulatedPayFailBtn');
      const cancelBtn = document.getElementById('closeSimulatedModalBtn');

      // Clear previous event listeners for a clean state
      const newSuccBtn = succBtn.cloneNode(true);
      const newFailBtn = failBtn.cloneNode(true);
      const newCancelBtn = cancelBtn.cloneNode(true);
      succBtn.replaceWith(newSuccBtn);
      failBtn.replaceWith(newFailBtn);
      cancelBtn.replaceWith(newCancelBtn);

      newSuccBtn.onclick = async () => {
        newSuccBtn.innerHTML = 'Processing...';
        newSuccBtn.disabled = true;
        
        try {
          const simulatedPaymentId = 'pay_sim_' + Math.random().toString(36).substr(2, 9);
          const verifyRes = await api.post('/payment/verify-payment', {
            orderId: orderData.orderId,
            razorpay_payment_id: simulatedPaymentId,
            razorpay_signature: 'mock_signature'
          });
          
          if (verifyRes.data.success) {
            simModal.classList.add('hidden');
            showToast('Payment verified! Generating bill...', 'success');
            
            const currentItems = [...JSON.parse(localStorage.getItem('ll_cart')) || []];
            localStorage.removeItem('ll_cart');
            updateCartBadge();
            
            showBillModal(simulatedPaymentId, totalAmount, currentItems, verifyRes.data.previewUrl);
          } else {
            showToast('Verification failed: ' + verifyRes.data.message, 'error');
          }
        } catch (verErr) {
          showToast('Payment verification error', 'error');
        } finally {
          newSuccBtn.innerHTML = '✅ Simulate Success';
          newSuccBtn.disabled = false;
        }
      };

      newFailBtn.onclick = () => {
        simModal.classList.add('hidden');
        showToast('Payment Failed (Simulated)', 'error');
      };

      newCancelBtn.onclick = () => {
        simModal.classList.add('hidden');
      };
    }

  } catch (error) {
    console.error("Checkout issue:", error);
    showToast(error?.response?.data?.error || 'Failed to initiate checkout', 'error');
  } finally {
    btn.innerHTML = 'Checkout securely <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';
    btn.disabled = false;
  }
}

// ─── Toast ────────────────────────────────────
function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Bill/Receipt Modal ────────────────────────
function showBillModal(txnId, total, items, previewUrl = null) {
  const modal = document.getElementById('billModal');
  const itemsList = document.getElementById('billItemsList');
  if (!modal || !itemsList) return;

  document.getElementById('billTxnId').textContent = txnId;
  document.getElementById('billTotalAmount').textContent = '₹' + total.toLocaleString();

  itemsList.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'flex justify-between items-start';
    el.innerHTML = `
      <div class="flex-1">
        <div class="font-bold text-gray-800">${item.title}</div>
      </div>
      <div class="font-bold text-gray-900 ml-4">₹${item.price}</div>
    `;
    itemsList.appendChild(el);
  });

  const emailResContainer = document.getElementById('emailReceiptContainer');
  const emailResLink = document.getElementById('emailReceiptLink');
  if (emailResContainer && emailResLink) {
    if (previewUrl) {
      emailResLink.href = previewUrl;
      emailResContainer.classList.remove('hidden');
    } else {
      emailResContainer.classList.add('hidden');
    }
  }

  const closeBtn = document.getElementById('closeBillBtn');
  if (closeBtn) {
    // Clone to remove old instances
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.replaceWith(newCloseBtn);
    newCloseBtn.onclick = () => {
      modal.classList.add('hidden');
      initSection('overview');
      loadSection('overview');
    };
  }

  modal.classList.remove('hidden');
}
