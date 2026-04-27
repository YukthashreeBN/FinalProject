/**
 * api.js – Axios configuration & centralized API calls
 * LiveLearn Plus
 */

// ── DEBUG MODE ──
// Set to false to silence all chatbot debug logs before going to production.
const CHATBOT_DEBUG = true;
function dbg(...args) { if (CHATBOT_DEBUG) console.log('[ChatbotAPI]', ...args); }

// axios.min.js is loaded locally (js/axios.min.js) – always available
const API_BASE_URL = 'http://localhost:5000/api';

// ── Axios instance – always created, never null ──
// Previously: `const api = (typeof axios !== 'undefined') ? axios.create(...) : null`
// That caused every API call to silently fall back to simulation if axios wasn't
// ready at parse time. Now we create it unconditionally.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor – attach JWT token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ll_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401 globally (token expired → redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ll_token');
      localStorage.removeItem('ll_user');
      window.location.href = 'login.html';
    }
    return Promise.reject(error);
  }
);

// ─────────────── AUTH ───────────────
// Backend routes: POST /api/auth/register, POST /api/auth/login
const AuthAPI = {
  // Always calls the real backend. No simulation fallback.
  // A demo/fake token stored from a previous session would cause chatbot 401s.
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role }),

  logout: () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    window.location.href = 'login.html';
  }
};

// ─────────────── STUDENT ───────────────
// Maps to real backend routes:
//   GET  /api/courses/all         → all courses (public)
//   GET  /api/videos              → all videos  (protected)
//   GET  /api/notes               → all notes   (protected)
//   GET  /api/quizzes             → all quizzes (public)
//   POST /api/quizzes/:id/submit  → submit quiz (protected)
//   POST /api/book-requests       → request a book (protected)
const StudentAPI = {
  getClasses:          () => api ? api.get('/courses/all')           : simulateClasses(),
  getEnrolledCourses:  () => api ? api.get('/courses/enrolled')      : simulateEnrolledCourses(),
  getVideos:           () => api ? api.get('/videos')                : simulateVideos(),
  getCourseVideos:     (id) => api ? api.get(`/videos/course/${id}`) : simulateCourseVideos(id),
  getNotes:            () => api ? api.get('/notes')                 : simulateNotes(),
  getQuizzes:          () => api ? api.get('/quizzes')               : simulateQuizzes(),
  submitQuiz:          (id, answers) => api ? api.post(`/quizzes/${id}/submit`, { answers }) : simulateQuizSubmit(answers),
  requestBook:         (data) => api ? api.post('/book-requests', { bookName: data.title || data.bookName, subject: data.subject, reason: data.reason }) : simulateSuccess('Book request submitted!'),
  getMyBookRequests:   () => api ? api.get('/book-requests/my') : simulateMyBookRequests(),
  getRecommendedBooks: () => api ? api.get('/book-recommendations') : simulateBooks(),
  getNotifications:    () => api ? api.get('/notifications')        : simulateNotifications(),
  markNotifRead:       (id) => api ? api.put(`/notifications/${id}/read`) : simulateMarkRead(id),
  markAllNotifRead:    () => api ? api.put('/notifications/read-all') : simulateMarkAllRead(),
};

// ─────────────── TEACHER ───────────────
// Maps to real backend routes:
//   POST /api/courses/create   → create course
//   POST /api/notes/upload     → upload notes (multipart)
//   POST /api/videos/upload    → upload video (multipart)
//   POST /api/quizzes/create   → create quiz
//   GET  /api/doubts           → get all doubts
//   PUT  /api/doubts/:id/reply → reply to a doubt
const TeacherAPI = {
  createCourse:  (data)     => api ? api.post('/courses/create', { title: data.name, description: data.description || data.subject, youtubePlaylistId: data.youtubePlaylistId || "" }) : simulateSuccess('Course created!'),
  getMyCourses:  ()         => api ? api.get('/courses')                        : simulateMyCourses(),
  updateCourse:  (id, data) => api ? api.put(`/courses/${id}`, data)            : simulateSuccess('Course updated!'),
  uploadNotes:   (formData) => api ? api.post('/notes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }) : simulateSuccess('Notes uploaded!'),
  uploadVideo:   (data)     => api ? api.post('/videos/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }) : simulateSuccess('Video uploaded!'),
  createQuiz:    (data)     => api ? api.post('/quizzes/create', data)          : simulateSuccess('Quiz created!'),
  getDoubts:     ()         => api ? api.get('/doubts')                         : simulateDoubts(),
  answerDoubt:   (id, ans)  => api ? api.put(`/doubts/${id}/reply`, { reply: ans }) : simulateSuccess('Answer submitted!'),
  recommendBook: (data)     => api ? api.post('/book-recommendations', data) : simulateSuccess('Book recommended!'),
  getBookRequests: ()       => api ? api.get('/book-requests') : simulateBookRequests(),
  updateBookRequest: (id, status) => api ? api.put(`/book-requests/${id}`, { status }) : simulateSuccess('Request updated!'),
};

// ─────────────── CHATBOT ───────────────
// POST /api/chatbot  → Gemini-powered chatbot (chatbotRoutes.js)
// POST /api/doubts   → AI doubt solver + save to DB

// Returns true if the stored token is a known fake demo token.
function isFakeToken(token) {
  return !token || ['demo_student_token','demo_teacher_token','demo_admin_token'].includes(token);
}

const ChatbotAPI = {
  sendMessage: (message, history = []) => {
    const token = localStorage.getItem('ll_token');
    dbg('sendMessage called');
    dbg('  token present:', !!token);
    dbg('  token value  :', token ? token.slice(0, 20) + '...' : 'MISSING');
    dbg('  message      :', message);

    if (isFakeToken(token)) {
      // Surface this immediately rather than letting the backend reject with 401
      // which would silently redirect the user.
      const err = new Error('No valid auth token. Please log out and log in again.');
      err.isFakeToken = true;
      dbg('ERROR - fake/missing token detected, rejecting before network call');
      return Promise.reject(err);
    }

    dbg('  firing POST /api/chatbot ...');
    return api.post('/chatbot', { message, history })
      .then(res => {
        dbg('  SUCCESS - response:', res.data);
        return res;
      })
      .catch(err => {
        dbg('  FAILED - status:', err?.response?.status);
        dbg('  FAILED - data  :', err?.response?.data);
        dbg('  FAILED - msg   :', err.message);
        throw err;  // re-throw so chatbot.js catch block handles UI
      });
  },

  // Posts to /api/doubts and normalises the response shape.
  // Errors are intentionally surfaced so the UI can show them.
  askDoubt: (doubt) =>
    api.post('/doubts', { questionText: doubt })
       .then(res => ({ data: { reply: res.data.aiResponse || res.data.questionText || 'Response received!' } })),
};

// ─────────────── PAYMENT ───────────────
// POST /api/create-order    → placeholder route
// POST /api/verify-payment  → placeholder route
// GET  /api/orders          → placeholder route
const PaymentAPI = {
  getOrders: () => 
    api ? api.get('/payment/orders') : simulateGetOrders(),

  createOrder: (courseId, amount, courseName, paymentMethod) =>
    api ? api.post('/payment/create-order', { courseId, amount, courseName, paymentMethod }) : simulateOrder(courseId, amount),

  verifyPayment: (data) =>
    api ? api.post('/payment/verify-payment', data) : simulateVerify(),
};

// ─────────────── ADMIN ───────────────
// GET  /api/admin/users                  → list all users
// GET  /api/admin/teachers/pending       → pending teacher approvals
// POST /api/admin/teacher/:id/approve    → approve teacher
// POST /api/admin/teacher/:id/reject     → reject teacher
// GET  /api/admin/payments               → payment log
const AdminAPI = {
  getUsers:       () => api ? api.get('/admin/users')                          : simulateUsers(),
  getTeachers:    () => api ? api.get('/admin/teachers/pending')               : simulatePendingTeachers(),
  approveTeacher: (id) => api ? api.post(`/admin/teacher/${id}/approve`)      : simulateSuccess('Teacher approved!'),
  rejectTeacher:  (id) => api ? api.post(`/admin/teacher/${id}/reject`)       : simulateSuccess('Teacher rejected!'),
  getPayments:    () => api ? api.get('/admin/payments')                       : simulatePayments(),
};

// ══════════════════════════════════
//   SIMULATION FUNCTIONS (Demo Mode – used when api is null)
// ══════════════════════════════════

function simulateDelay(ms = 800) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateLogin(email, password) {
  await simulateDelay(1000);
  const users = {
    'student@demo.com': { id: 1, name: 'Rahul Student', role: 'student', token: 'demo_student_token' },
    'teacher@demo.com': { id: 2, name: 'Prof. Sharma',  role: 'teacher', token: 'demo_teacher_token' },
    'admin@demo.com':   { id: 3, name: 'Admin User',    role: 'admin',   token: 'demo_admin_token'   },
  };
  const user = users[email.toLowerCase()];
  if (user && password === 'demo123') {
    return { data: { token: user.token, user } };
  }
  throw { response: { data: { message: 'Invalid email or password.' } } };
}

async function simulateRegister(name, email, password, role) {
  await simulateDelay(1000);
  return { data: { message: 'User registered successfully', user: { name, email, role } } };
}

async function simulateClasses() {
  await simulateDelay(600);
  return { data: [
    { _id: '1', title: 'Advanced Calculus', description: 'Mathematics – Mon, Wed 3:00 PM', enrolledStudents: [], createdBy: { name: 'Prof. Sharma' } },
    { _id: '2', title: 'Classical Mechanics', description: 'Physics – Tue, Thu 11:00 AM', enrolledStudents: [], createdBy: { name: 'Prof. Kapoor' } },
    { _id: '3', title: 'Organic Chemistry', description: 'Chemistry – Fri 2:00 PM', enrolledStudents: [], createdBy: { name: 'Dr. Mehta' } },
  ] };
}

async function simulateVideos() {
  await simulateDelay(600);
  return { data: [
    { _id: 'v1', title: 'Introduction to Limits', description: 'Mathematics', uploadedBy: { name: 'Prof. Sharma' }, filePath: '' },
    { _id: 'v2', title: "Newton's Laws of Motion", description: 'Physics', uploadedBy: { name: 'Prof. Kapoor' }, filePath: '' },
    { _id: 'v3', title: 'Organic Reactions – Part 1', description: 'Chemistry', uploadedBy: { name: 'Dr. Mehta' }, filePath: '' },
  ] };
}

async function simulateEnrolledCourses() {
  await simulateDelay(600);
  return { data: [
    { _id: '1', title: 'Advanced Calculus', description: 'Mathematics – Mon, Wed 3:00 PM', createdBy: { name: 'Prof. Sharma' } },
  ] };
}

async function simulateMyCourses() {
  await simulateDelay(600);
  return { data: { data: [
    { _id: '1', title: 'Advanced Calculus', description: 'Mathematics – Mon, Wed 3:00 PM', createdBy: { name: 'Prof. Sharma' }, youtubePlaylistId: 'PLxyz' },
  ] } };
}

async function simulateCourseVideos(courseId) {
  await simulateDelay(600);
  return { data: [
    { _id: 'v1', title: 'Module 1: Getting Started', description: 'Overview of the course.', uploadedBy: { name: 'Prof. Sharma' }, filePath: '' },
    { _id: 'v2', title: 'Module 2: Depth Analysis', description: 'Technical deep dive.', uploadedBy: { name: 'Prof. Sharma' }, filePath: '' },
    { _id: 'v3', title: 'Module 3: Project Work', description: 'Applying what we learned.', uploadedBy: { name: 'Prof. Sharma' }, filePath: '' },
  ] };
}

async function simulateNotes() {
  await simulateDelay(600);
  return { data: [
    { _id: '1', title: 'Calculus – Chapter 1: Limits', originalName: 'calculus_ch1.pdf', uploadedBy: { name: 'Prof. Sharma' }, createdAt: '2024-01-15' },
    { _id: '2', title: "Newton's Laws Notes", originalName: 'newton_laws.pdf', uploadedBy: { name: 'Prof. Kapoor' }, createdAt: '2024-01-18' },
    { _id: '3', title: 'Organic Chemistry – Reactions', originalName: 'organic_chem.pdf', uploadedBy: { name: 'Dr. Mehta' }, createdAt: '2024-01-20' },
  ] };
}

async function simulateQuizzes() {
  await simulateDelay(600);
  return { data: [
    {
      _id: '1', title: 'Calculus – Limits Quiz', courseId: { title: 'Mathematics' },
      questions: [
        { questionText: 'What is the limit of (sin x)/x as x → 0?', options: ['0', '1', 'undefined', '∞'], correctAnswer: '1' },
        { questionText: 'The derivative of x² is:', options: ['x', '2x', '2x²', 'x/2'], correctAnswer: '2x' },
      ]
    },
    {
      _id: '2', title: "Newton's Laws Quiz", courseId: { title: 'Physics' },
      questions: [
        { questionText: "Newton's 2nd law states F =", options: ['ma', 'mv', 'm/a', 'a/m'], correctAnswer: 'ma' },
        { questionText: 'Unit of force in SI is:', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctAnswer: 'Newton' },
      ]
    },
  ] };
}

async function simulateQuizSubmit(answers) {
  await simulateDelay(500);
  return { data: { score: 2, totalQuestions: answers ? answers.length : 2 } };
}

async function simulateBooks() {
  await simulateDelay(600);
  return { data: { books: [
    { title: 'Higher Engineering Mathematics', author: 'B.S. Grewal', subject: 'Mathematics' },
    { title: 'Concepts of Physics', author: 'H.C. Verma', subject: 'Physics' },
    { title: 'Organic Chemistry', author: 'Morrison & Boyd', subject: 'Chemistry' },
  ] } };
}

async function simulateMyBookRequests() {
  await simulateDelay(500);
  return { data: [
    { _id: 'r1', bookName: 'Physics Vol 1', status: 'fulfilled', createdAt: new Date().toISOString() },
    { _id: 'r2', bookName: 'Calc II', status: 'pending', createdAt: new Date().toISOString() }
  ] };
}

async function simulateDoubts() {
  await simulateDelay(600);
  return { data: [
    { _id: '1', studentId: { name: 'Rahul S.' }, questionText: 'How does integration by parts work?', teacherReply: null, createdAt: '2024-01-20' },
    { _id: '2', studentId: { name: 'Priya K.' }, questionText: 'Explain conservation of momentum.', teacherReply: null, createdAt: '2024-01-21' },
    { _id: '3', studentId: { name: 'Arjun M.' }, questionText: 'Difference between definite and indefinite integrals?', teacherReply: 'A definite integral has limits and gives a number; an indefinite integral gives a function + C.', createdAt: '2024-01-19' },
  ] };
}

async function simulateChatResponse(message) {
  await simulateDelay(1200);
  const responses = [
    `Great question! "${message.slice(0, 30)}..." — This concept is fundamental. Step 1: identify the key variables. Step 2: apply the relevant formula. Step 3: verify your answer.`,
    `Sure! Here's a simple explanation about "${message.slice(0, 30)}...": Think of it as building blocks — once you understand the basics, everything else falls into place.`,
    `Good question! This is a common area of confusion. The key thing to remember is the relationship between the variables and how they interact in this context.`,
  ];
  return { data: { reply: responses[Math.floor(Math.random() * responses.length)] } };
}

async function simulateOrder(courseId, amount) {
  await simulateDelay(1000);
  return { data: { orderId: 'LL-' + Date.now(), amount, currency: 'INR' } };
}

async function simulateGetOrders() {
  await simulateDelay(800);
  return { data: { success: true, orders: [
    { orderId: 'LL-12345', courseName: 'Advanced Calculus', amount: 499, currency: 'INR', status: 'success', createdAt: new Date().toISOString() },
    { orderId: 'LL-67890', courseName: 'Classical Mechanics', amount: 799, currency: 'INR', status: 'success', createdAt: new Date(Date.now() - 86400000).toISOString() }
  ] } };
}

async function simulateVerify() {
  await simulateDelay(1500);
  return { data: { success: true, message: 'Payment verified!' } };
}

async function simulateUsers() {
  await simulateDelay(600);
  return { data: { users: [
    { _id: '1', name: 'Rahul Sharma', email: 'rahul@example.com', role: 'student', createdAt: '2024-01-10' },
    { _id: '2', name: 'Prof. Sharma', email: 'sharma@example.com', role: 'teacher', createdAt: '2024-01-05' },
    { _id: '3', name: 'Admin User', email: 'admin@example.com', role: 'admin', createdAt: '2024-01-01' },
  ] } };
}

async function simulatePendingTeachers() {
  await simulateDelay(600);
  return { data: { teachers: [
    { id: '10', name: 'Amit Verma', email: 'amit@example.com', subject: 'Physics', experience: '5 years', status: 'pending' },
    { id: '11', name: 'Sneha Iyer', email: 'sneha@example.com', subject: 'Chemistry', experience: '3 years', status: 'pending' },
  ] } };
}

async function simulatePayments() {
  await simulateDelay(600);
  return { data: { payments: [
    { orderId: 'LL-001', student: 'Rahul S.', course: 'Calculus Pro', amount: '₹499', status: 'success', date: '2024-01-20' },
    { orderId: 'LL-002', student: 'Priya K.', course: 'Physics Elite', amount: '₹799', status: 'success', date: '2024-01-21' },
  ] } };
}

async function simulateSuccess(message) {
  await simulateDelay(800);
  return { data: { success: true, message } };
}

// Notification Simulations
async function simulateNotifications() {
  await simulateDelay(400);
  let notifs = JSON.parse(localStorage.getItem('ll_sim_notifs'));
  if (!notifs) {
    notifs = [
      { _id: 'n1', type: 'VIDEO_UPLOAD', title: 'New Video Uploaded', message: 'A new video "01. Introduction" has been added to Full Stack Web Dev.', isRead: false, createdAt: new Date().toISOString() },
      { _id: 'n2', type: 'GENERAL', title: 'Welcome!', message: 'Welcome to LiveLearn Plus. Explore your dashboard to get started.', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() }
    ];
    localStorage.setItem('ll_sim_notifs', JSON.stringify(notifs));
  }
  return { data: notifs };
}

async function simulateMarkRead(id) {
  let notifs = JSON.parse(localStorage.getItem('ll_sim_notifs')) || [];
  notifs = notifs.map(n => n._id === id ? { ...n, isRead: true } : n);
  localStorage.setItem('ll_sim_notifs', JSON.stringify(notifs));
  return { data: { success: true } };
}

async function simulateMarkAllRead() {
  let notifs = JSON.parse(localStorage.getItem('ll_sim_notifs')) || [];
  notifs = notifs.map(n => ({ ...n, isRead: true }));
  localStorage.setItem('ll_sim_notifs', JSON.stringify(notifs));
  return { data: { success: true } };
}
