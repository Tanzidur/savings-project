const params = new URLSearchParams(window.location.search);
const offerId = params.get('offerId');

let selectedCardId = null;
let currentOfferCategory = null;
let currentOfferTitle = null;

fetch('/api/offers')
  .then(res => res.json())
  .then(offers => {
    const offer = offers.find(o => o.id == offerId);
    if (offer) {
      currentOfferCategory = offer.category;
      currentOfferTitle = offer.title;
      document.getElementById('offer-summary').innerHTML = `
        <h3>${offer.title}</h3>
        <p>${offer.merchant} &middot; ${offer.discount}</p>
      `;
    }
  });

fetch('/api/my-cards', { credentials: 'include' })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(cards => {
    if (!cards) return;
    renderCardOptions(cards);
  });

function renderCardOptions(cards) {
  const container = document.getElementById('my-cards-container');

  if (!cards || cards.length === 0) {
    container.innerHTML = `<p class="loading-msg">You have no saved cards. <a href="card-selection.html">Add one from Card Perks</a> first.</p>`;
    return;
  }

  container.innerHTML = '';
  cards.forEach(card => {
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
  amountInput.classList.remove('invalid');

  fetch('/api/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ category: currentOfferCategory, amount: amount, offerTitle: currentOfferTitle })
    })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('select-card-view').classList.add('hidden');
      document.getElementById('success-view').classList.remove('hidden');
      document.getElementById('success-detail').textContent =
        `You spent ${amount.toFixed(2)} BDT on "${currentOfferTitle}" and it's now in your transaction log.`;
    } else {
      showToast(data.error || 'Payment failed', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});