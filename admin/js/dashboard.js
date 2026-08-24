const STAT_LABELS = ['Banks', 'Cards', 'Merchants', 'Articles', 'Offers', 'Users'];
const STAT_KEYS = ['banks', 'cards', 'merchants', 'articles', 'offers', 'users'];

fetch('/api/admin/stats', { credentials: 'include' })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);

    const container = document.getElementById('stat-cards');
    container.innerHTML = STAT_KEYS.map((key, i) => `
      <div class="stat-card">
        <div class="stat-value">${data[key]}</div>
        <div class="stat-label">${STAT_LABELS[i]}</div>
      </div>
    `).join('');
  })
  .catch(err => {
    console.error('Failed to load admin stats:', err);
    showToast('Could not load dashboard stats', 'error');
  });
