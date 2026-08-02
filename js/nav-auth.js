(function () {
  const authItem = document.getElementById('nav-auth-item');
  if (!authItem) return;

  fetch('/api/session', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) {
        authItem.innerHTML = `<a href="${NAV_BASE}dashboard.html" class="btn-login">${data.name}</a>`;

        const logoutItem = document.createElement('li');
        logoutItem.innerHTML = `<button id="nav-logout-btn" style="background:none;border:none;color:var(--color-text,#555);cursor:pointer;font-weight:500;font-size:1rem;">Log Out</button>`;
        authItem.after(logoutItem);

        document.getElementById('nav-logout-btn').addEventListener('click', () => {
          fetch('/api/logout', { method: 'POST', credentials: 'include' })
            .then(() => {
              window.location.href = NAV_BASE === '' ? '../index.html' : 'index.html';
            });
        });
      }
    })
    .catch(err => console.error('Session check failed:', err));
})();