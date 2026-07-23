const API = 'http://127.0.0.1:5000/api';

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
    renderTransactionsList(data.transactions);
    renderChart(data.transactions);
  })
  .catch(err => {
    console.error(err);
  });

document.getElementById('logout-btn').addEventListener('click', () => {
  fetch(`${API}/logout`, { method: 'POST', credentials: 'include' })
    .then(() => window.location.href = '../index.html');
});

function renderTransactionsList(transactions) {
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';

  transactions.slice().reverse().forEach(t => {
    const row = document.createElement('div');
    row.className = 'transaction-row';
    row.innerHTML = `
      <span class="transaction-category">${t.category}</span>
      <span>${t.amount.toFixed(2)} BDT</span>
      <span class="transaction-date">${t.date}</span>
    `;
    list.appendChild(row);
  });
}

function renderChart(transactions) {
  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const ctx = document.getElementById('spending-chart');
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