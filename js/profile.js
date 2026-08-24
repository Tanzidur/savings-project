fetch('/api/profile', { credentials: 'include' })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    document.getElementById('profile-name').value = data.name;
    document.getElementById('profile-email').value = data.email;
  });

document.getElementById('info-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;

  fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Profile updated', 'success');
    } else {
      showToast(data.error || 'Could not update profile', 'error');
    }
  });
});

document.getElementById('password-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;

  fetch('/api/profile/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Password updated', 'success');
      document.getElementById('password-form').reset();
    } else {
      showToast(data.error || 'Could not update password', 'error');
    }
  });
});