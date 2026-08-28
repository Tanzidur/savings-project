const params = new URLSearchParams(window.location.search);
const offerId = params.get('offerId');

let selectedCardId = null;
let currentOfferCategory = null;
let currentOfferTitle = null;
let currentOfferId = offerId;
let currentOfferBankId = null;
let currentOfferBankName = null;

Promise.all([
  fetch('/api/offers').then(res => res.json()),
  fetch('/api/my-cards', { credentials: 'include' }).then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
]).then(([offers, cards]) => {
  if (!cards) return;

  const offer = (offers || []).find(o => o.id == offerId);
  if (offer) {
    currentOfferCategory = offer.category;
    currentOfferTitle = offer.title;
    currentOfferBankId = offer.bankId;
    currentOfferBankName = offer.bankName;
    document.getElementById('offer-summary').innerHTML = `
      <h3>${offer.title}</h3>
      <p>${offer.merchant} &middot; ${offer.discount}</p>
      <p class="offer-bank-note">Requires a saved ${offer.bankName} card</p>
    `;
    if (offer.isExpired) {
      document.getElementById('my-cards-container').innerHTML =
        '<p class="loading-msg">This offer has expired and cannot be redeemed.</p>';
      return;
    }
  }

  renderCardOptions(cards);
}).catch(err => {
  showToast('Could not load payout details. Is Flask running?', 'error');
  console.error(err);
});

function renderCardOptions(cards) {
  const container = document.getElementById('my-cards-container');
  const eligible = (cards || []).filter(card =>
    !currentOfferBankId || card.bankId === currentOfferBankId
  );

  if (!cards || cards.length === 0) {
    container.innerHTML = `<p class="loading-msg">You have no saved cards. <a href="card-selection.html">Add a ${currentOfferBankName || ''} card from Card Perks</a> first.</p>`;
    return;
  }

  if (eligible.length === 0) {
    container.innerHTML = `<p class="loading-msg">This deal is only for ${currentOfferBankName} cards. <a href="card-selection.html">Save a ${currentOfferBankName} card on Card Perks</a> to redeem it.</p>`;
    return;
  }

  container.innerHTML = '';
  eligible.forEach(card => {
    const option = document.createElement('div');
    option.className = 'payout-card-option';
    option.innerHTML = `
      <div class="payout-card-info">
        <strong>${card.network} ${card.tier}</strong>
        <span>${card.bankName}</span>
      </div>
    `;
    option.addEventListener('click', () => {
      document.querySelectorAll('.payout-card-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selectedCardId = card.id;
      document.getElementById('confirm-pay-btn').classList.remove('hidden');
    });
    container.appendChild(option);
  });
}

document.getElementById('confirm-pay-btn').addEventListener('click', () => {
  const amountInput = document.getElementById('spend-amount');
  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    amountInput.classList.add('invalid');
    showToast('Please enter how much you spent', 'error');
    return;
  }
  if (!selectedCardId) {
    showToast('Select an eligible card', 'error');
    return;
  }
  amountInput.classList.remove('invalid');

  fetch('/api/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      category: currentOfferCategory,
      amount: amount,
      offerTitle: currentOfferTitle,
      offerId: currentOfferId,
      cardId: selectedCardId
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('select-card-view').classList.add('hidden');
      document.getElementById('success-view').classList.remove('hidden');
      document.getElementById('success-detail').textContent =
        `You spent ${amount.toFixed(2)} BDT on "${currentOfferTitle}"` +
        (data.savingsAmount ? ` and saved about ${Number(data.savingsAmount).toFixed(2)} BDT.` : '.') +
        ` It's now in your transaction log.`;
    } else {
      showToast(data.error || 'Payment failed', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});
