/**
 * student.js – Student Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('student');
  loadUserInfo();
  initSidebar();
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

function initSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`section-${name}`);
  if (el) el.classList.remove('hidden');
  const pageTitle = document.getElementById('pageTitle');
  const titles = { overview: 'Overview', classes: 'My Classes', videos: 'Watch Videos', notes: 'Download Notes', quiz: 'Take Quiz', doubt: 'Ask Doubt (AI)', books: 'Book Request' };
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
    grid.innerHTML = courses.map((c, i) => `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="w-11 h-11 ${colors[i % colors.length]} rounded-xl flex items-center justify-center font-bold text-lg">${(c.title || c.name || '?').charAt(0)}</div>
          <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Free</span>
        </div>
        <h3 class="font-semibold text-gray-900 text-sm mb-1">${c.title || c.name}</h3>
        <p class="text-xs text-gray-400 mb-3">👤 ${c.createdBy ? (c.createdBy.name || 'Teacher') : 'Teacher'}</p>
        <div class="text-xs text-gray-500 mb-3">${c.description || ''}</div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">${(c.enrolledStudents || []).length} enrolled</span>
          <button class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition" onclick="enrollCourse('${c._id || c.id}')">Join</button>
        </div>
      </div>`).join('');
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

// ─── Books ────────────────────────────────────
async function loadBooks() {
  const list = document.getElementById('recommendedBooksList');
  if (!list) return;
  try {
    const res   = await StudentAPI.getRecommendedBooks();
    const books = res.data.books || [];
    list.innerHTML = books.map(b => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <span class="text-2xl">📚</span>
        <div><div class="font-medium text-sm text-gray-900">${b.title}</div><div class="text-xs text-gray-500">${b.author} • ${b.subject}</div></div>
      </div>`).join('');
  } catch { list.innerHTML = '<p class="text-sm text-gray-400">Failed to load books.</p>'; }

  // Book request form
  const form = document.getElementById('bookRequestForm');
  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title:   document.getElementById('bookTitle').value,
      subject: document.getElementById('bookSubject').value,
      reason:  document.getElementById('bookReason').value,
    };
    if (!data.title || !data.subject) { showToast('Please fill in all fields.', 'error'); return; }
    try {
      await StudentAPI.requestBook(data);
      showToast('Book request submitted! ✅', 'success');
      form.reset();
    } catch { showToast('Failed to submit request.', 'error'); }
  });
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

// ─── Toast ────────────────────────────────────
function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
