const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

const API = '/api';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const emailInput = document.getElementById('login-email');
  const email = emailInput.value;
  const password = document.getElementById('login-password').value;

  if (!isValidEmail(email)) {
    emailInput.classList.add('invalid');
    showToast('Please enter a valid email address', 'error');
    return;
  }
  emailInput.classList.remove('invalid');

  fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      window.location.href = 'dashboard.html';
    } else {
      showToast(data.error || 'Login failed', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('register-name').value;
  const emailInput = document.getElementById('register-email');
  const email = emailInput.value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (!isValidEmail(email)) {
    emailInput.classList.add('invalid');
    showToast('Please enter a valid email address', 'error');
    return;
  }
  emailInput.classList.remove('invalid');

  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      window.location.href = 'dashboard.html';
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});