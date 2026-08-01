const API = 'http://127.0.0.1:5000/api';

console.log('Dashboard.js loaded');

// Fetch dashboard data
fetch(`${API}/dashboard`, { credentials: 'include' })
  .then(res => {
    console.log('Dashboard response status:', res.status);
    if (res.status === 401) {
      console.log('Not logged in, redirecting to login...');
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) {
      console.log('No data returned');
      return;
    }

    console.log('Dashboard data received:', data);
    document.getElementById('welcome-heading').textContent = `Welcome back, ${data.name}!`;
    
    if (data.transactions && data.transactions.length > 0) {
      renderTransactionsList(data.transactions);
      renderChart(data.transactions);
    } else {
      console.log('No transactions found');
      document.getElementById('transactions-list').innerHTML = '<p>No transactions yet</p>';
    }
  })
  .catch(err => {
    console.error('Dashboard error:', err);
    document.getElementById('transactions-list').innerHTML = '<p>Error loading dashboard</p>';
  });

// Logout button handler - only add if button exists
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    console.log('Logout clicked');
    fetch(`${API}/logout`, { 
      method: 'POST', 
      credentials: 'include' 
    })
    .then(() => {
      console.log('Logout successful');
      window.location.href = '../index.html';
    })
    .catch(err => {
      console.error('Logout error:', err);
      window.location.href = '../index.html';
    });
  });
} else {
  console.warn('Logout button not found');
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
    row.innerHTML = `
      <span class="transaction-category">${t.category}</span>
      <span>${t.amount.toFixed(2)} BDT</span>
      <span class="transaction-date">${t.date}</span>
    `;
    list.appendChild(row);
  });
}

function renderChart(transactions) {
  if (!transactions || transactions.length === 0) {
    console.log('No transactions to render in chart');
    return;
  }

  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const ctx = document.getElementById('spending-chart');
  if (!ctx) {
    console.error('Chart canvas not found');
    return;
  }

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
