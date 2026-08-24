(function () {
  fetch('/api/admin/session', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (!data.loggedIn) {
        window.location.href = 'login.html';
        return;
      }
      const emailEl = document.getElementById('admin-user-email');
      if (emailEl) emailEl.textContent = data.email;
    })
    .catch(err => {
      console.error('Admin session check failed:', err);
      window.location.href = 'login.html';
    });

  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
          .then(() => { window.location.href = 'login.html'; })
          .catch(() => { window.location.href = 'login.html'; });
      });
    }
  });
})();
