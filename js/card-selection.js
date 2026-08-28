let banksData = [];
let currentBankCards = [];
let currentFilter = 'All';
let currentSelectedCardId = null;
let compareIds = [];
let allCardsIndex = {};

const bankListEl = document.getElementById('bank-list');
const cardSection = document.getElementById('card-section');
const cardGrid = document.getElementById('card-grid');
const benefitsSection = document.getElementById('benefits-section');
const benefitsBoxEl = document.getElementById('benefits-box');

fetch('/api/banks')
  .then(response => response.json())
  .then(data => {
    banksData = data;
    data.forEach(bank => {
      (bank.cards || []).forEach(card => {
        allCardsIndex[card.id] = { ...card, bankName: bank.name, bankId: bank.id };
      });
    });
    renderBankButtons();
  })
  .catch(error => {
    console.error('Error loading banks:', error);
  });

function renderBankButtons() {
  bankListEl.innerHTML = '';
  banksData.forEach(bank => {
    const btn = document.createElement('button');
    btn.className = 'bank-btn';
    btn.textContent = bank.name;
    btn.addEventListener('click', () => selectBank(bank.id, btn));
    bankListEl.appendChild(btn);
  });
}

function selectBank(bankId, clickedBtn) {
  document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');

  benefitsSection.classList.add('hidden');
  currentSelectedCardId = null;

  const bank = banksData.find(b => b.id === bankId);
  currentBankCards = bank.cards;

  currentFilter = 'All';
  document.querySelectorAll('#type-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#type-filter-bar .filter-btn[data-filter="All"]').classList.add('active');

  cardSection.classList.remove('hidden');
  renderCardGrid();
}

document.querySelectorAll('#type-filter-bar .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#type-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderCardGrid();
  });
});

function renderCardGrid() {
  const filtered = currentFilter === 'All'
    ? currentBankCards
    : currentBankCards.filter(c => c.type === currentFilter);

  cardGrid.innerHTML = '';

  if (filtered.length === 0) {
    cardGrid.innerHTML = '<p class="loading-msg">No cards match this filter.</p>';
    return;
  }

  filtered.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'card-tile' + (currentSelectedCardId === card.id ? ' selected' : '');
    const checked = compareIds.includes(card.id) ? 'checked' : '';
    tile.innerHTML = `
      <label class="compare-check" onclick="event.stopPropagation()">
        <input type="checkbox" data-compare-id="${card.id}" ${checked}> Compare
      </label>
      <div class="card-tile-network">${card.network}</div>
      <div class="card-tile-tier">${card.tier}</div>
      <span class="card-tile-type">${card.type}</span>
    `;
    tile.addEventListener('click', () => selectCard(card, tile));
    tile.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      toggleCompare(card.id, e.target.checked, e.target);
    });
    cardGrid.appendChild(tile);
  });
}

function selectCard(card, clickedTile) {
  document.querySelectorAll('.card-tile').forEach(t => t.classList.remove('selected'));
  clickedTile.classList.add('selected');

  currentSelectedCardId = card.id;

  benefitsBoxEl.innerHTML = `
    <div class="benefit-row">
      <span class="benefit-label">Cashback</span>
      <span class="benefit-value">${card.cashback}</span>
    </div>
    <div class="benefit-row">
      <span class="benefit-label">Reward Points</span>
      <span class="benefit-value">${card.rewardPoints}</span>
    </div>
    <div class="benefit-row">
      <span class="benefit-label">EMI Facility</span>
      <span class="benefit-value">${card.emi ? 'Available' : 'Not Available'}</span>
    </div>
    <div class="benefit-row">
      <span class="benefit-label">Annual Fee</span>
      <span class="benefit-value">${card.annualFee}</span>
    </div>
  `;

  document.getElementById('save-card-status').textContent = '';
  benefitsSection.classList.remove('hidden');
}

document.getElementById('save-card-btn').addEventListener('click', () => {
  fetch('/api/my-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cardId: currentSelectedCardId })
  })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    const status = document.getElementById('save-card-status');
    if (data.success) {
      status.style.color = 'green';
      status.textContent = 'Card saved to your account.';
    } else {
      status.style.color = 'orange';
      status.textContent = data.error || 'Could not save card.';
    }
  });
});

function parsePercent(str) {
  if (!str) return 0;
  const withPct = String(str).match(/(\d+(?:\.\d+)?)\s*%/);
  if (withPct) return parseFloat(withPct[1]);
  const bare = String(str).trim().match(/^(\d+(?:\.\d+)?)$/);
  return bare ? parseFloat(bare[1]) : 0;
}

function parseFee(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function toggleCompare(cardId, checked, inputEl) {
  if (checked) {
    if (compareIds.length >= 3) {
      inputEl.checked = false;
      document.getElementById('compare-status').textContent = 'You can compare up to 3 cards.';
      return;
    }
    if (!compareIds.includes(cardId)) compareIds.push(cardId);
  } else {
    compareIds = compareIds.filter(id => id !== cardId);
  }
  document.getElementById('compare-status').textContent = `${compareIds.length} selected`;
}

function renderCompareTable() {
  const wrap = document.getElementById('compare-table-wrap');
  const status = document.getElementById('compare-status');
  const cards = compareIds.map(id => allCardsIndex[id]).filter(Boolean);
  if (cards.length < 2) {
    status.textContent = 'Select at least 2 cards to compare.';
    wrap.innerHTML = '';
    return;
  }

  const monthly = parseFloat(document.getElementById('compare-spend').value) || 0;
  const yearlySpend = monthly * 12;

  const rows = [
    ['Bank', c => c.bankName],
    ['Network', c => c.network],
    ['Type', c => c.type],
    ['Tier', c => c.tier],
    ['Cashback', c => c.cashback],
    ['Reward points', c => c.rewardPoints],
    ['EMI', c => c.emi ? 'Yes' : 'No'],
    ['Annual fee', c => c.annualFee],
    ['Est. yearly cashback', c => `${(yearlySpend * (parsePercent(c.cashback) / 100)).toFixed(0)} BDT`],
    ['Est. yearly net (cashback − fee)', c => {
      const net = yearlySpend * (parsePercent(c.cashback) / 100) - parseFee(c.annualFee);
      return `${net.toFixed(0)} BDT`;
    }]
  ];

  let html = '<table class="compare-table"><thead><tr><th></th>';
  cards.forEach(c => {
    html += `<th>${c.network} ${c.tier}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(([label, getter]) => {
    html += `<tr><th>${label}</th>`;
    cards.forEach(c => {
      html += `<td>${getter(c)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += `<p class="compare-hint">Estimate uses ${monthly.toLocaleString()} BDT/month × 12 and parses cashback/fee from the stored text. Not a live bank quote.</p>`;
  wrap.innerHTML = html;
  status.textContent = '';
}

document.getElementById('compare-btn').addEventListener('click', renderCompareTable);
document.getElementById('compare-clear').addEventListener('click', () => {
  compareIds = [];
  document.querySelectorAll('input[data-compare-id]').forEach(i => { i.checked = false; });
  document.getElementById('compare-table-wrap').innerHTML = '';
  document.getElementById('compare-status').textContent = '';
});