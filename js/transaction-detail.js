const params = new URLSearchParams(window.location.search);
const transactionId = params.get('id');

const box = document.getElementById('detail-box');

fetch(`/api/transaction/${transactionId}`, { credentials: 'include' })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(t => {
    if (!t) return;

    if (t.error) {
      box.innerHTML = `<p class="loading-msg">${t.error}</p>`;
      return;
    }

    box.innerHTML = `
      <span class="detail-category-badge">${t.category}</span>
      <div class="detail-amount">${t.amount.toFixed(2)} BDT</div>
      <p class="detail-description">${t.description || 'No description available.'}</p>
      <div class="detail-meta">
        Date: ${t.date}
        ${t.offerTitle ? `<br>Redeemed via: ${t.offerTitle}` : ''}
      </div>
    `;
  })
  .catch(err => {
    box.innerHTML = '<p class="loading-msg">Could not load transaction.</p>';
    console.error(err);
  });