let banksData = [];
let selectedBankId = null;

const bankListEl = document.getElementById('bank-list');
const cardListEl = document.getElementById('card-list');
const benefitsBoxEl = document.getElementById('benefits-box');

// Fetch the mock "database" file
fetch('http://localhost:5000/api/banks')
  .then(response => response.json())
  .then(data => {
    banksData = data;
    renderBankButtons();
  })
  .catch(error => {
    bankListEl.innerHTML = '<p class="placeholder-msg">Could not load banks.json</p>';
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
}