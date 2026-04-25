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
    const unreadCount = notifs.filter(n => !n.isRead).length;

    // Update badge
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (!notifs.length) {
      list.innerHTML = '<div class="p-8 text-center text-gray-400"><div class="text-3xl mb-2">🔔</div><div class="text-sm font-medium">No new notifications</div></div>';
      return;
    }

    list.innerHTML = notifs.map(n => `
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
  const titles = { overview: 'Overview', classes: 'Courses', videos: 'Watch Videos', notes: 'Resources', quiz: 'Take Quiz', doubt: 'Ask Doubt (AI)', books: 'Book Request', cart: 'Your Cart', orders: 'Order History', 'my-courses': 'My Courses', 'course-player': 'Course Player' };
  if (pageTitle) pageTitle.textContent = titles[name] || name;
}

// ─── Load section data ────────────────────────
async function loadSection(name) {
  const loaders = {
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
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow relative" ${cardStyle}>
        <div class="flex items-center justify-between mb-4">
          <div class="w-11 h-11 ${colors[i % colors.length]} rounded-xl flex items-center justify-center font-bold text-lg">${(c.title || c.name || '?').charAt(0)}</div>
          <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Free</span>
          ${isEnrolled ? '<span class="absolute top-4 right-4 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Owned</span>' : ''}
        </div>
        <h3 class="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">${c.title || c.name}</h3>
        <p class="text-xs text-gray-400 mb-3">👤 ${c.createdBy ? (c.createdBy.name || 'Teacher') : 'Teacher'}</p>
        <div class="text-xs text-gray-500 mb-3 line-clamp-2">${c.description || 'Quality education for future leaders.'}</div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400 font-bold">₹499</span>
          ${btnHtml}
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
        <button onclick="openCoursePlayer('${c._id || c.id}', '${(c.title || '').replace(/'/g, "\\'")}')" class="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-blue-600 transition flex items-center justify-center gap-2">
          Study Now
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>
    `).join('');
    
  } catch (error) {
    grid.innerHTML = '<div class="col-span-3 text-center text-red-500 py-8">Failed to load courses.</div>';
  }
}

// ─── Course Player ────────────────────────────
let currentCourseVideos = [];

async function openCoursePlayer(courseId, courseTitle) {
  initSection('course-player');
  const playlist = document.getElementById('coursePlaylist');
  const titleEl = document.getElementById('currentPlayerCourseTitle');
  const countEl = document.getElementById('playlistCount');
  
  if (titleEl) titleEl.textContent = courseTitle;
  if (playlist) playlist.innerHTML = '<div class="p-6 text-center text-gray-400">Loading playlist...</div>';
  
  // Reset player UI
  document.getElementById('videoPlaceholder').classList.remove('hidden');
  document.getElementById('courseVideoPlayer').pause();
  document.getElementById('courseVideoPlayer').src = '';
  document.getElementById('currentVideoTitle').textContent = 'Select a Module';
  document.getElementById('currentVideoDesc').textContent = 'Choose a video from the playlist to start learning.';

  try {
    const res = await StudentAPI.getCourseVideos(courseId);
    currentCourseVideos = Array.isArray(res.data) ? res.data : (res.data.videos || []);
    
    if (countEl) countEl.textContent = `${currentCourseVideos.length} LESSONS`;
    
    if (!currentCourseVideos.length) {
      playlist.innerHTML = '<div class="p-8 text-center text-gray-400"><div class="text-3xl mb-2">📭</div><div class="text-sm font-bold">No videos yet</div><p class="text-[10px] mt-1">Check back later for updates.</p></div>';
      return;
    }

    playlist.innerHTML = currentCourseVideos.map((v, i) => `
      <div class="playlist-item group p-4 hover:bg-blue-50 cursor-pointer transition flex gap-3 items-center" data-index="${i}">
        <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-600 transition">
          ${String(i + 1).padStart(2, '0')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700 transition">${v.title}</div>
          <div class="text-[10px] text-gray-400 font-medium">Video • placeholder duration</div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition text-blue-600">
           <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
        </div>
      </div>
    `).join('');

    // Attach playlist clicks
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = item.dataset.index;
        playVideoAtIndex(idx);
        
        // UI highlight
        document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-600'));
        item.classList.add('bg-blue-50', 'border-l-4', 'border-blue-600');
      });
    });

  } catch (error) {
    playlist.innerHTML = '<div class="p-6 text-center text-red-400 text-xs font-bold">Failed to load playlist.</div>';
  }
}

function playVideoAtIndex(index) {
  const video = currentCourseVideos[index];
  if (!video) return;

  const player = document.getElementById('courseVideoPlayer');
  const placeholder = document.getElementById('videoPlaceholder');
  const title = document.getElementById('currentVideoTitle');
  const desc = document.getElementById('currentVideoDesc');

  placeholder.classList.add('hidden');
  title.textContent = video.title;
  desc.textContent = video.description || 'No description available for this lesson.';

  const fileUrl = video.filePath ? `http://localhost:5000/${video.filePath.replace(/\\/g, '/')}` : '';
  if (fileUrl) {
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

function startQuiz(quiz) {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth' });

  // Normalize questions to a common shape regardless of backend vs simulation
  const questionList = (quiz.questions || quiz.questions_data || []).map(q => ({
    text:    q.questionText || q.q || '',
    options: q.options || [],
    // Real backend: correctAnswer is the actual string; simulation: answer is the index
    correct: typeof q.answer === 'number' ? q.answer :
             (q.options || []).indexOf(q.correctAnswer),
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
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn  = document.getElementById('sendDoubt');
  const input    = document.getElementById('doubtInput');
  const messages = document.getElementById('doubtChatMessages');

  sendBtn && sendBtn.addEventListener('click', sendDoubt);
  input   && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDoubt(); });

  async function sendDoubt() {
    const msg = input?.value.trim();
    if (!msg || !messages) return;
    input.value = '';

    // User bubble
    messages.innerHTML += `<div class="flex justify-end"><div class="bg-blue-600 text-white rounded-xl rounded-br-none p-3 text-sm max-w-xs">${msg}</div></div>`;
    messages.innerHTML += `<div id="typingDoubt" class="flex gap-2 items-center"><div class="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs flex-shrink-0">AI</div><div class="text-xs text-gray-400 italic">Typing...</div></div>`;
    messages.scrollTop = messages.scrollHeight;

    try {
      const res   = await ChatbotAPI.askDoubt(msg);
      const reply = res.data.reply;
      document.getElementById('typingDoubt')?.remove();
      messages.innerHTML += `<div class="flex gap-3"><div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">AI</div><div class="bg-blue-50 rounded-xl rounded-tl-none p-3 text-sm text-gray-700 max-w-xs">${reply}</div></div>`;
      messages.scrollTop = messages.scrollHeight;
    } catch {
      document.getElementById('typingDoubt')?.remove();
      messages.innerHTML += `<div class="text-xs text-red-400 text-center">Failed to get response.</div>`;
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
