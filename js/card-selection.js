let banksData = [];
let currentBankCards = [];
let currentFilter = 'All';
let currentSelectedCardId = null;

const bankListEl = document.getElementById('bank-list');
const cardSection = document.getElementById('card-section');
const cardGrid = document.getElementById('card-grid');
const benefitsSection = document.getElementById('benefits-section');
const benefitsBoxEl = document.getElementById('benefits-box');

fetch('/api/banks')
  .then(response => response.json())
  .then(data => {
    banksData = data;
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
    tile.className = 'card-tile';
    tile.innerHTML = `
      <div class="card-tile-network">${card.network}</div>
      <div class="card-tile-tier">${card.tier}</div>
      <span class="card-tile-type">${card.type}</span>
    `;
    tile.addEventListener('click', () => selectCard(card, tile));
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