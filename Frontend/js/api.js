/**
 * api.js – Axios configuration & centralized API calls
 * LiveLearn Plus
 */

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ll_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
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
const AuthAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) => api.post('/auth/register', { name, email, password, role }),
  logout: () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    window.location.href = 'login.html';
  }
};

// ─────────────── STUDENT ───────────────
const StudentAPI = {
  getClasses:          () => api.get('/courses/all'),
  getEnrolledCourses:  () => api.get('/courses/enrolled'),
  getVideos:           () => api.get('/videos'),
  getCourseVideos:     (id) => api.get(`/videos/course/${id}`),
  getNotes:            () => api.get('/notes'),
  getQuizzes:          () => api.get('/quizzes'),
  getQuizForTaking:    (id) => api.get(`/quizzes/${id}/take`),
  submitQuiz:          (id, answers) => api.post(`/quizzes/${id}/submit`, { answers }),
  requestBook:         (data) => api.post('/book-requests', { bookName: data.title || data.bookName, subject: data.subject, reason: data.reason }),
  getMyBookRequests:   () => api.get('/book-requests/my'),
  getRecommendedBooks: () => api.get('/book-recommendations'),
  getNotifications:    () => api.get('/notifications'),
  markNotifRead:       (id) => api.put(`/notifications/${id}/read`),
  markAllNotifRead:    () => api.put('/notifications/read-all'),
};

// ─────────────── TEACHER ───────────────
const TeacherAPI = {
  createCourse:  (data)     => api.post('/courses/create', { title: data.name, description: data.description || data.subject, youtubePlaylistId: data.youtubePlaylistId || "" }),
  getMyCourses:  ()         => api.get('/courses'),
  updateCourse:  (id, data) => api.put(`/courses/${id}`, data),
  uploadNotes:   (formData) => api.post('/notes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadVideo:   (data)     => api.post('/videos/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createQuiz:    (data)     => api.post('/quizzes/create', data),
  getDoubts:     ()         => api.get('/doubts'),
  answerDoubt:   (id, ans)  => api.put(`/doubts/${id}/reply`, { reply: ans }),
  recommendBook: (data)     => api.post('/book-recommendations', data),
  getBookRequests: ()       => api.get('/book-requests'),
  updateBookRequest: (id, status) => api.put(`/book-requests/${id}`, { status }),
};

// ─────────────── DOUBTS ───────────────
const DoubtAPI = {
  askDoubt: (doubt) => api.post('/doubts', { questionText: doubt }).then(res => ({ data: { reply: res.data.reply || 'Your doubt has been submitted!' } })),
  getMyDoubts: () => api.get('/doubts'),
};

// ─────────────── PAYMENT ───────────────
const PaymentAPI = {
  getOrders: () => api.get('/payment/orders'),
  createOrder: (courseId, amount, courseName, paymentMethod) => api.post('/payment/create-order', { courseId, amount, courseName, paymentMethod }),
  verifyPayment: (data) => api.post('/payment/verify-payment', data),
};

// ─────────────── ADMIN ───────────────
const AdminAPI = {
  getOverview:    () => api.get('/admin/overview'),
  getActivity:    () => api.get('/admin/activity'),
  getUsers:       () => api.get('/admin/users'),
  deleteUser:     (id) => api.delete(`/admin/users/${id}`),
  getTeachers:    () => api.get('/admin/teachers/pending'),
  approveTeacher: (id) => api.post(`/admin/teacher/${id}/approve`),
  rejectTeacher:  (id) => api.post(`/admin/teacher/${id}/reject`),
  getPayments:    () => api.get('/admin/payments'),
  getCourses:     () => api.get('/admin/courses'),
  deleteCourse:   (id) => api.delete(`/admin/courses/${id}`),
};
