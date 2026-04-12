/**
 * auth.js – Login & Registration logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  const user = getStoredUser();
  if (user && (window.location.pathname.includes('login') || window.location.pathname.includes('register'))) {
    redirectToDashboard(user.role);
    return;
  }

  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const togglePwd    = document.getElementById('togglePassword');

  loginForm    && initLoginForm(loginForm);
  registerForm && initRegisterForm(registerForm);
  togglePwd    && initPasswordToggle(togglePwd);
});

// ─── Login ───────────────────────────────────
function initLoginForm(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let valid = true;
    if (!isValidEmail(email)) { showError('emailError', 'Please enter a valid email.'); valid = false; }
    if (password.length < 6)  { showError('passwordError', 'Password must be at least 6 characters.'); valid = false; }
    if (!valid) return;

    setLoading('loginBtn', 'loginBtnText', 'loginSpinner', true);

    try {
      const res  = await AuthAPI.login(email, password);
      const data = res.data;

      // Backend returns: { message, token, user: { id, name, role } }
      // Simulation returns same shape for consistency
      if (data.token && data.user) {
        localStorage.setItem('ll_token', data.token);
        localStorage.setItem('ll_user', JSON.stringify(data.user));
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => redirectToDashboard(data.user.role), 800);
      } else {
        showAlert(data.message || 'Login failed. Unexpected response.', 'error');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please try again.';
      showAlert(msg, 'error');
    } finally {
      setLoading('loginBtn', 'loginBtnText', 'loginSpinner', false);
    }
  });
}

// ─── Register ────────────────────────────────
function initRegisterForm(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const role    = document.getElementById('role').value;
    const pass    = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;

    let valid = true;
    if (!name)               { showError('nameError',    'Name is required.');               valid = false; }
    if (!isValidEmail(email)){ showError('emailError',   'Please enter a valid email.');      valid = false; }
    if (!role)               { showError('roleError',    'Please select a role.');            valid = false; }
    if (pass.length < 6)     { showError('passwordError','Password must be at least 6 chars.');valid = false; }
    if (pass !== confirm)    { showError('confirmError', 'Passwords do not match.');          valid = false; }
    if (!valid) return;

    setLoading('registerBtn', 'registerBtnText', 'registerSpinner', true);

    try {
      const res = await AuthAPI.register(name, email, pass, role);
      // Backend returns: { message: "User registered successfully", user: {...} }
      // Simulation returns same shape for consistency
      if (res.data.user || res.data.message) {
        showAlert('Account created! Redirecting to login...', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      showAlert(msg, 'error');
    } finally {
      setLoading('registerBtn', 'registerBtnText', 'registerSpinner', false);
    }
  });
}

// ─── Password toggle ─────────────────────────
function initPasswordToggle(btn) {
  btn.addEventListener('click', () => {
    const input = document.getElementById('password');
    input.type  = input.type === 'password' ? 'text' : 'password';
  });
}

// ─── Helpers ─────────────────────────────────
function redirectToDashboard(role) {
  const map = { student: 'student-dashboard.html', teacher: 'teacher-dashboard.html', admin: 'admin-dashboard.html' };
  window.location.href = map[role] || 'student-dashboard.html';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach(el => el.classList.add('hidden'));
}

function showAlert(msg, type = 'info') {
  const box = document.getElementById('alertBox');
  if (!box) return;
  box.textContent = msg;
  box.className   = `mb-4 p-3 rounded-lg text-sm font-medium ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
  box.classList.remove('hidden');
}

function setLoading(btnId, textId, spinnerId, loading) {
  const btn     = document.getElementById(btnId);
  const text    = document.getElementById(textId);
  const spinner = document.getElementById(spinnerId);
  if (!btn) return;
  btn.disabled    = loading;
  text  && (text.textContent  = loading ? 'Please wait...' : text.dataset.original || text.textContent);
  spinner && spinner.classList.toggle('hidden', !loading);
}
