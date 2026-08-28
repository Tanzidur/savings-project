const API = '/api';

fetch(`${API}/dashboard`, { credentials: 'include' })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;

    document.getElementById('welcome-heading').textContent = `Welcome back, ${data.name}!`;

    fetch('/api/profile', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(profile => {
        const el = document.getElementById('verify-status');
        if (!el || !profile) return;
        if (profile.accountVerified) {
          el.textContent = 'Account verified';
          el.classList.add('is-verified');
        } else {
          el.innerHTML = 'Account not verified — <a href="profile.html">complete Settings</a>';
          el.classList.remove('is-verified');
        }
      });

    const saved = Number(data.monthlySavings || 0).toFixed(2);
    document.getElementById('savings-banner').innerHTML =
      `This month you saved <strong>${saved} BDT</strong> from redeemed offers`;

    const expiring = data.expiringOffers || [];
    const expiringCard = document.getElementById('expiring-card');
    const expiringList = document.getElementById('expiring-list');
    if (expiring.length > 0) {
      expiringCard.hidden = false;
      expiringList.innerHTML = '';
      expiring.forEach(o => {
        const row = document.createElement('a');
        row.className = 'expiring-row';
        row.href = `offer-detail.html?offerId=${o.id}`;
        row.innerHTML = `<span>${o.title}</span><span>${o.merchant} · until ${o.validUntil}</span>`;
        expiringList.appendChild(row);
      });
    } else {
      expiringCard.hidden = true;
    }

    if (data.transactions && data.transactions.length > 0) {
      renderTransactionsList(data.transactions);
      renderChart(data.transactions);
    } else {
      document.getElementById('transactions-list').innerHTML = '<p>No transactions yet</p>';
    }
  })
  .catch(err => {
    console.error('Dashboard error:', err);
    document.getElementById('transactions-list').innerHTML = '<p>Error loading dashboard</p>';
  });

fetch('/api/my-cards', { credentials: 'include' })
  .then(res => res.json())
  .then(cards => {
    renderMyCards(cards);
  })
  .catch(err => console.error('My cards error:', err));

function renderMyCards(cards) {
  const container = document.getElementById('my-cards-list');

  if (!cards || cards.length === 0) {
    container.innerHTML = '<p class="loading-msg">No cards saved yet. Add one from Card Perks.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'my-cards-grid';

  cards.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'my-card-tile';
    tile.innerHTML = `
      <div class="card-tile-network">${card.network} ${card.tier}</div>
      <div class="card-tile-bank">${card.bankName}</div>
      <button class="remove-card-btn" data-card-id="${card.id}">Remove</button>
    `;
    grid.appendChild(tile);
  });

  container.innerHTML = '';
  container.appendChild(grid);

  document.querySelectorAll('.remove-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;

      fetch(`/api/my-cards/${cardId}`, { method: 'DELETE', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Card removed', 'success');
            fetch('/api/my-cards', { credentials: 'include' })
              .then(res => res.json())
              .then(cards => renderMyCards(cards));
          } else {
            showToast(data.error || 'Could not remove card', 'error');
          }
        });
    });
  });
}
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    fetch(`${API}/logout`, { method: 'POST', credentials: 'include' })
      .then(() => window.location.href = '../index.html')
      .catch(() => window.location.href = '../index.html');
  });
}

function renderTransactionsList(transactions) {
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    list.innerHTML = '<p>No transactions yet</p>';
    return;
  }

  transactions.slice().reverse().forEach(t => {
    const row = document.createElement('div');
    row.className = 'transaction-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
    <div>
      <span class="transaction-category">${t.category}</span>
      ${t.offerTitle ? `<div class="transaction-offer-tag">via ${t.offerTitle}</div>` : ''}
    </div>
    <span>${t.amount.toFixed(2)} BDT</span>
    <span class="transaction-date">${t.date}</span>
    <span class="row-arrow">&rarr;</span>
    `;
    row.addEventListener('click', () => {
      window.location.href = `transaction-detail.html?id=${t.id}`;
    });
    list.appendChild(row);
  });
}

function renderChart(transactions) {
  if (!transactions || transactions.length === 0) return;

  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const ctx = document.getElementById('spending-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(totals),
      datasets: [{
        data: Object.values(totals),
        backgroundColor: ['#0b6e4f', '#1a936f', '#88d498', '#c6dabf', '#f3e9d2', '#f4a259']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}