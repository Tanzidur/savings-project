let banksData = [];
let selectedBankId = null;
let currentSelectedCardId = null;

const bankListEl = document.getElementById('bank-list');
const cardListEl = document.getElementById('card-list');
const benefitsBoxEl = document.getElementById('benefits-box');

// Fetch banks + cards from Flask/MySQL
fetch('http://127.0.0.1:5000/api/banks')
  .then(response => response.json())
  .then(data => {
    banksData = data;
    renderBankButtons();
  })
  .catch(error => {
    bankListEl.innerHTML = '<p class="placeholder-msg">Could not load banks. Is Flask running?</p>';
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
  selectedBankId = bankId;

  document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');

  benefitsBoxEl.innerHTML = '<p class="placeholder-msg">Select a card above to view its benefits.</p>';
  document.getElementById('save-card-btn').classList.add('hidden');
  document.getElementById('save-card-status').textContent = '';

  const bank = banksData.find(b => b.id === bankId);
  renderCardButtons(bank.cards);
}

function renderCardButtons(cards) {
  cardListEl.innerHTML = '';
  cards.forEach(card => {
    const btn = document.createElement('button');
    btn.className = 'card-btn';
    btn.textContent = `${card.network} ${card.type} - ${card.tier}`;
    btn.addEventListener('click', () => selectCard(card, btn));
    cardListEl.appendChild(btn);
  });
}

function selectCard(card, clickedBtn) {
  document.querySelectorAll('.card-btn').forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');

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

  document.getElementById('save-card-btn').classList.remove('hidden');
  document.getElementById('save-card-status').textContent = '';
}

// Save the currently selected card to the logged-in user's account
document.getElementById('save-card-btn').addEventListener('click', () => {
  fetch('http://127.0.0.1:5000/api/my-cards', {
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