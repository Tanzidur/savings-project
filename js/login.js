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

const API = 'http://127.0.0.1:5000/api';

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Login successful, redirecting to dashboard...');
      // Redirect to dashboard after successful login
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      alert(data.error || 'Login failed');
    }
  })
  .catch(err => {
    alert('Could not reach server. Is Flask running?');
    console.error(err);
  });
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (password !== confirm) {
    alert('Passwords do not match');
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
      console.log('Registration successful, redirecting to dashboard...');
      // Redirect to dashboard after successful registration
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      alert(data.error || 'Registration failed');
    }
  })
  .catch(err => {
    alert('Could not reach server. Is Flask running?');
    console.error(err);
  });
});
