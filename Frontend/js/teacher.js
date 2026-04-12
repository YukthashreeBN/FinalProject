/**
 * teacher.js – Teacher Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadUserInfo();
  initSidebar();
  initSection('overview');
});

function requireAuth() {
  const user = getStoredUser();
  if (!user) window.location.href = 'login.html';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
}

function loadUserInfo() {
  const user = getStoredUser() || { name: 'Teacher' };
  document.getElementById('sidebarName') && (document.getElementById('sidebarName').textContent = user.name);
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

  // Quick action buttons on overview
  document.querySelectorAll('.sidebar-link-action[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      document.querySelector(`.sidebar-link[data-section="${s}"]`)?.classList.add('active');
      activateSection(s);
    });
  });
}

function initSection(name) { activateSection(name); }

function activateSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`section-${name}`);
  if (el) el.classList.remove('hidden');
  const titles = { overview: 'Teacher Dashboard', 'create-class': 'Create Class', 'upload-notes': 'Upload Notes', 'upload-video': 'Upload Video', 'create-quiz': 'Create Quiz', 'view-doubts': 'Student Doubts', 'recommend-books': 'Recommend Books' };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[name] || name;

  const loaders = { 'view-doubts': loadDoubts };
  if (loaders[name]) loaders[name]();
  initSectionForms(name);
}

function initSectionForms(name) {
  if (name === 'create-class')    initCreateClassForm();
  if (name === 'upload-notes')    initUploadNotesForm();
  if (name === 'upload-video')    initUploadVideoForm();
  if (name === 'create-quiz')     initCreateQuizForm();
  if (name === 'recommend-books') initRecommendBooksForm();
}

// ─── Create Class ─────────────────────────────
function initCreateClassForm() {
  const form = document.getElementById('createClassForm');
  if (!form || form.dataset.init) return;
  form.dataset.init = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('className').value,
      subject: document.getElementById('classSubject').value,
      description: document.getElementById('classDesc').value,
      schedule: document.getElementById('classSchedule').value,
      maxStudents: document.getElementById('classMax').value,
      type: document.getElementById('classType').value,
    };
    if (!data.name || !data.subject) { showToast('Please fill required fields.', 'error'); return; }
    try {
      await TeacherAPI.createClass(data);
      showToast('Class created successfully! ✅', 'success');
      form.reset();
    } catch { showToast('Failed to create class.', 'error'); }
  });
}

// ─── Upload Notes ─────────────────────────────
function initUploadNotesForm() {
  const form     = document.getElementById('uploadNotesForm');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('notesFile');
  const preview  = document.getElementById('filePreview');
  const removeBtn = document.getElementById('removeFile');

  if (!form || form.dataset.init) return;
  form.dataset.init = '1';

  dropZone && dropZone.addEventListener('click', () => fileInput.click());

  fileInput && fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) showFilePreview(file);
  });

  dropZone && dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
  dropZone && dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-blue-500'));
  dropZone && dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500');
    const file = e.dataTransfer.files[0];
    if (file) { fileInput.files = e.dataTransfer.files; showFilePreview(file); }
  });

  removeBtn && removeBtn.addEventListener('click', () => {
    fileInput.value = '';
    preview.classList.add('hidden');
    dropZone.classList.remove('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title   = document.getElementById('notesTitle').value;
    const subject = document.getElementById('notesSubject').value;
    if (!title || !subject) { showToast('Please fill all fields.', 'error'); return; }
    try {
      await TeacherAPI.uploadNotes({ title, subject });
      showToast('Notes uploaded successfully! ✅', 'success');
      form.reset();
      preview.classList.add('hidden');
    } catch { showToast('Upload failed.', 'error'); }
  });

  function showFilePreview(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    preview.classList.remove('hidden');
  }
}

// ─── Upload Video ─────────────────────────────
function initUploadVideoForm() {
  const form = document.getElementById('uploadVideoForm');
  if (!form || form.dataset.init) return;
  form.dataset.init = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('videoTitle').value,
      description: document.getElementById('videoDesc').value,
      url: document.getElementById('videoUrl').value,
    };
    if (!data.title) { showToast('Please enter a title.', 'error'); return; }
    try {
      await TeacherAPI.uploadVideo(data);
      showToast('Video uploaded! ✅', 'success');
      form.reset();
    } catch { showToast('Upload failed.', 'error'); }
  });
}

// ─── Create Quiz ──────────────────────────────
function initCreateQuizForm() {
  const addBtn = document.getElementById('addQuestion');
  const saveBtn = document.getElementById('saveQuiz');
  const builder = document.getElementById('quizQuestionsBuilder');
  if (!addBtn || addBtn.dataset.init) return;
  addBtn.dataset.init = '1';

  let qCount = 0;

  addBtn.addEventListener('click', () => {
    qCount++;
    const div = document.createElement('div');
    div.className = 'mb-5 border border-gray-100 rounded-xl p-4 bg-gray-50';
    div.dataset.qid = qCount;
    div.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="font-semibold text-sm text-gray-700">Question ${qCount}</span>
        <button type="button" class="remove-q text-gray-400 hover:text-red-500 text-xs">Remove</button>
      </div>
      <input type="text" placeholder="Enter question..." class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      <div class="grid grid-cols-2 gap-2">
        ${[1,2,3,4].map(n => `<input type="text" placeholder="Option ${n}" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>`).join('')}
      </div>
      <div class="mt-3">
        <label class="text-xs font-semibold text-gray-600">Correct Answer:</label>
        <select class="ml-2 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          <option>Option 1</option><option>Option 2</option><option>Option 3</option><option>Option 4</option>
        </select>
      </div>`;
    builder.appendChild(div);
    div.querySelector('.remove-q').addEventListener('click', () => { div.remove(); });
  });

  saveBtn && saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('quizTitle').value;
    if (!title) { showToast('Enter quiz title.', 'error'); return; }
    const qs = builder.querySelectorAll('[data-qid]');
    if (!qs.length) { showToast('Add at least one question.', 'error'); return; }
    try {
      await TeacherAPI.createQuiz({ title, questions: qs.length });
      showToast('Quiz saved! ✅', 'success');
      document.getElementById('quizTitle').value = '';
      builder.innerHTML = '';
      qCount = 0;
    } catch { showToast('Failed to save quiz.', 'error'); }
  });
}

// ─── Doubts ───────────────────────────────────
async function loadDoubts() {
  const list = document.getElementById('doubtsList');
  if (!list) return;
  list.innerHTML = '<div class="text-center text-gray-400 py-8">Loading doubts...</div>';
  try {
    const res    = await TeacherAPI.getDoubts();
    // Real backend returns array directly; simulation returns array under .doubts
    const doubts = Array.isArray(res.data) ? res.data : (res.data.doubts || []);
    if (!doubts.length) { list.innerHTML = '<div class="text-center text-gray-400 py-8">No doubts posted yet.</div>'; return; }
    list.innerHTML = doubts.map(d => {
      // Support both real backend fields and simulation fields
      const studentName = d.studentId ? (d.studentId.name || 'Student') : (d.student || 'Student');
      const subject     = d.studentId ? (d.studentId.email || '') : (d.subject || '');
      const question    = d.questionText || d.question || '';
      const dateStr     = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : (d.date || '');
      const isAnswered  = !!(d.teacherReply || d.status === 'answered');
      const doubtId     = d._id || d.id;
      return `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">${studentName.charAt(0)}</div>
              <div><div class="font-semibold text-sm">${studentName}</div><div class="text-xs text-gray-400">${subject} • ${dateStr}</div></div>
            </div>
            <span class="${isAnswered ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} text-xs px-2 py-0.5 rounded-full font-medium">${isAnswered ? 'answered' : 'pending'}</span>
          </div>
          <p class="text-sm text-gray-700 mb-4 bg-gray-50 rounded-xl p-3">${question}</p>
          ${d.teacherReply ? `<p class="text-sm text-green-700 bg-green-50 rounded-xl p-3 mb-2">🟢 ${d.teacherReply}</p>` : ''}
          ${!isAnswered ? `
            <div class="flex gap-2">
              <input type="text" placeholder="Type your answer..." class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" id="answerInput_${doubtId}"/>
              <button class="answer-btn bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition" data-id="${doubtId}">Reply</button>
            </div>` : ''}
        </div>`;
    }).join('');

    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const ans = document.getElementById(`answerInput_${id}`)?.value;
        if (!ans) { showToast('Type an answer first.', 'error'); return; }
        try {
          await TeacherAPI.answerDoubt(id, ans);
          showToast('Answer submitted! ✅', 'success');
          loadDoubts();
        } catch { showToast('Failed to submit.', 'error'); }
      });
    });
  } catch { list.innerHTML = '<div class="text-center text-red-400 py-8">Failed to load doubts.</div>'; }
}

// ─── Recommend Books ──────────────────────────
function initRecommendBooksForm() {
  const form = document.getElementById('recommendBookForm');
  if (!form || form.dataset.init) return;
  form.dataset.init = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('recBookTitle').value,
      author: document.getElementById('recBookAuthor').value,
      subject: document.getElementById('recBookSubject').value,
      notes: document.getElementById('recBookNotes').value,
    };
    if (!data.title || !data.author) { showToast('Please fill required fields.', 'error'); return; }
    try {
      await TeacherAPI.recommendBook(data);
      showToast('Book recommended! ✅', 'success');
      form.reset();
    } catch { showToast('Failed to recommend book.', 'error'); }
  });
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
