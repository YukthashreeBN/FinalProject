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
  const titles = { overview: 'Teacher Dashboard', 'my-courses': 'My Courses', 'create-class': 'Create Course', 'upload-notes': 'Upload Notes', 'create-quiz': 'Create Quiz', 'view-doubts': 'Student Doubts', 'recommend-books': 'Recommend Books', 'book-requests': 'Book Requests' };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[name] || name;

  const loaders = { overview: loadOverview, 'view-doubts': loadDoubts, 'book-requests': loadBookRequests, 'my-courses': loadMyCourses };
  if (loaders[name]) loaders[name]();
  initSectionForms(name);
}

function initSectionForms(name) {
  if (name === 'create-class')    initCreateCourseForm();
  if (name === 'upload-notes')    initUploadNotesForm();
  if (name === 'create-quiz')     initCreateQuizForm();
  if (name === 'recommend-books') initRecommendBooksForm();
}

// ─── Overview ─────────────────────────────────
async function loadOverview() {
  try {
    const res = await TeacherAPI.getOverview();
    const data = res.data;

    const elActiveClasses = document.getElementById('statActiveClasses');
    const elTotalStudents = document.getElementById('statTotalStudents');
    const elNotesUploaded = document.getElementById('statNotesUploaded');
    const elPendingDoubts = document.getElementById('statPendingDoubts');
    const elRecentDoubts = document.getElementById('recentDoubtsOverview');

    if (elActiveClasses) elActiveClasses.textContent = data.activeClasses || 0;
    if (elTotalStudents) elTotalStudents.textContent = data.totalStudents || 0;
    if (elNotesUploaded) elNotesUploaded.textContent = data.notesUploaded || 0;
    if (elPendingDoubts) elPendingDoubts.textContent = data.pendingDoubtsCount || 0;

    if (elRecentDoubts) {
      if (!data.recentDoubts || data.recentDoubts.length === 0) {
        elRecentDoubts.innerHTML = '<p class="text-sm text-gray-500">No recent doubts right now.</p>';
      } else {
        elRecentDoubts.innerHTML = data.recentDoubts.map(d => {
          const studentName = d.studentId ? d.studentId.name : 'Unknown Student';
          const question = d.questionText || '';
          return `
            <div class="p-3 bg-gray-50 rounded-xl">
              <p class="text-sm font-semibold text-gray-800 mb-1">${studentName}</p>
              <p class="text-xs text-gray-600 line-clamp-2">${question}</p>
            </div>
          `;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load overview data:', error);
  }
}

// ─── Create Course ─────────────────────────────
function initCreateCourseForm() {
  const form = document.getElementById('createClassForm');
  if (!form || form.dataset.init) return;
  form.dataset.init = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseData = {
      name: document.getElementById('className').value,
      subject: document.getElementById('classSubject').value,
      description: document.getElementById('classDesc').value,
      schedule: document.getElementById('classSchedule').value,
      maxStudents: document.getElementById('classMax').value,
      type: document.getElementById('classType').value,
      youtubePlaylistId: document.getElementById('classPlaylist').value,
    };
    if (!courseData.name || !courseData.subject) { showToast('Please fill required course fields.', 'error'); return; }
    
    try {
      const res = await TeacherAPI.createCourse(courseData);
      const courseId = res.data?._id;
      showToast('Course created successfully! ✅', 'success');

      // Handle optional video upload
      const videoTitle = document.getElementById('videoTitle').value;
      const videoUrl   = document.getElementById('videoUrl').value;
      const videoFile  = document.getElementById('videoFile').files[0];

      if (videoTitle && (videoUrl || videoFile)) {
        showToast('Uploading course video...', 'info');
        const formData = new FormData();
        formData.append('title', videoTitle);
        formData.append('description', document.getElementById('videoDesc').value);
        formData.append('courseId', courseId);
        if (videoFile) {
          formData.append('video', videoFile);
        } else {
          formData.append('url', videoUrl);
        }
        await TeacherAPI.uploadVideo(formData);
        showToast('Intro video attached! 🎥', 'success');
      }

      form.reset();
    } catch (err) { 
      console.error(err);
      showToast('Failed to complete course creation.', 'error'); 
    }
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
    const file    = fileInput.files[0];
    
    if (!title || !subject || !file) { showToast('Please fill all fields and select a file.', 'error'); return; }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('file', file);
    
    try {
      await TeacherAPI.uploadNotes(formData);
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
    const title = document.getElementById('quizTitle').value.trim();
    if (!title) { showToast('Enter quiz title.', 'error'); return; }
    const qs = builder.querySelectorAll('[data-qid]');
    if (!qs.length) { showToast('Add at least one question.', 'error'); return; }

    // Build proper question objects from the DOM
    const questions = [];
    let valid = true;
    qs.forEach((block) => {
      const inputs = block.querySelectorAll('input[type="text"]');
      const select = block.querySelector('select');
      const questionText = inputs[0] ? inputs[0].value.trim() : '';
      const options = [];
      for (let i = 1; i <= 4; i++) {
        options.push(inputs[i] ? inputs[i].value.trim() : '');
      }
      const correctIdx = select ? select.selectedIndex : 0;
      const correctAnswer = options[correctIdx] || '';

      if (!questionText) { valid = false; }
      if (options.some(o => !o)) { valid = false; }

      questions.push({ questionText, options, correctAnswer });
    });

    if (!valid) { showToast('Fill in all question fields and options.', 'error'); return; }

    try {
      await TeacherAPI.createQuiz({ title, questions });
      showToast('Quiz saved! ✅', 'success');
      document.getElementById('quizTitle').value = '';
      builder.innerHTML = '';
      qCount = 0;
    } catch { showToast('Failed to save quiz.', 'error'); }
  });
}

// ─── My Courses ───────────────────────────────
async function loadMyCourses() {
  const list = document.getElementById('myCoursesList');
  if (!list) return;
  list.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Loading your courses...</div>';
  try {
    const res = await TeacherAPI.getMyCourses();
    const courses = res.data?.data || res.data || [];
    
    if (!courses.length) {
      list.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">You have not created any courses yet.</div>';
      return;
    }
    
    list.innerHTML = courses.map(course => {
      const studentsCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
      return `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
          <h3 class="font-bold text-lg text-gray-800 mb-2 truncate" title="${course.title}">${course.title}</h3>
          <p class="text-sm text-gray-500 mb-4 flex-1 line-clamp-2" title="${course.description || ''}">${course.description || 'No description provided.'}</p>
          <div class="flex items-center justify-between text-xs text-gray-400 mb-4">
            <span>👥 ${studentsCount} enrolled</span>
            ${course.youtubePlaylistId ? '<span>🔗 Playlist linked</span>' : ''}
          </div>
          <button class="edit-course-btn w-full bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 border border-gray-200 transition" 
            data-id="${course._id}" 
            data-title="${encodeURIComponent(course.title)}" 
            data-desc="${encodeURIComponent(course.description || '')}" 
            data-playlist="${encodeURIComponent(course.youtubePlaylistId || '')}">
            Edit Course
          </button>
        </div>
      `;
    }).join('');

    // Setup Edit Modal logic
    const editBtns = document.querySelectorAll('.edit-course-btn');
    const modal = document.getElementById('editCourseModal');
    const closeBtns = [document.getElementById('closeEditModalBtn'), document.getElementById('cancelEditModalBtn')];
    const form = document.getElementById('editCourseForm');

    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('editCourseId').value = btn.dataset.id;
        document.getElementById('editCourseName').value = decodeURIComponent(btn.dataset.title);
        document.getElementById('editCourseDesc').value = decodeURIComponent(btn.dataset.desc);
        document.getElementById('editCoursePlaylist').value = decodeURIComponent(btn.dataset.playlist);
        modal.classList.remove('hidden');
      });
    });

    closeBtns.forEach(btn => btn?.addEventListener('click', () => modal.classList.add('hidden')));

    // Only attach submit listener once
    if (!form.dataset.init) {
      form.dataset.init = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCourseId').value;
        const data = {
          title: document.getElementById('editCourseName').value,
          description: document.getElementById('editCourseDesc').value,
          youtubePlaylistId: document.getElementById('editCoursePlaylist').value,
        };
        try {
          await TeacherAPI.updateCourse(id, data);
          showToast('Course updated successfully! ✅', 'success');
          modal.classList.add('hidden');
          loadMyCourses(); // refresh list
        } catch {
          showToast('Failed to update course.', 'error');
        }
      });
    }

  } catch {
    list.innerHTML = '<div class="col-span-full text-center text-red-400 py-8">Failed to load courses.</div>';
  }
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

// ─── Book Requests (Student -> Teacher) ─────────
async function loadBookRequests() {
  const tbody = document.getElementById('bookRequestsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400 text-sm">Loading requests...</td></tr>';
  try {
    const res = await TeacherAPI.getBookRequests();
    const requests = res.data || [];
    if (!requests.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400 text-sm">No book requests from students.</td></tr>';
      return;
    }
    tbody.innerHTML = requests.map(r => {
      const studentName = r.studentId ? (r.studentId.name || 'Unknown') : 'Unknown';
      const statusClass = r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                         r.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
      return `
        <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
          <td class="px-6 py-4 text-sm font-medium text-gray-800">${r.bookName}</td>
          <td class="px-6 py-4 text-sm text-gray-500">${studentName}</td>
          <td class="px-6 py-4 text-xs text-gray-500">${r.subject || 'N/A'}</td>
          <td class="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title="${r.reason || ''}">${r.reason || 'N/A'}</td>
          <td class="px-6 py-4 text-right space-x-2">
            ${r.status === 'pending' ? `
              <button class="status-btn text-xs font-bold text-green-600 hover:text-green-800" data-id="${r._id}" data-status="fulfilled">Fulfill</button>
              <button class="status-btn text-xs font-bold text-red-600 hover:text-red-800" data-id="${r._id}" data-status="cancelled">Cancel</button>
            ` : `<span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusClass}">${r.status}</span>`}
          </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.status;
        try {
          await TeacherAPI.updateBookRequest(id, status);
          showToast(`Request ${status}!`, 'success');
          loadBookRequests();
        } catch { showToast('Update failed.', 'error'); }
      });
    });
  } catch { tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400 text-sm">Error loading requests.</td></tr>'; }
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
