const adminLoginForm = document.getElementById('admin-login-form');

adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;

  fetch('/api/admin/login', {
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
