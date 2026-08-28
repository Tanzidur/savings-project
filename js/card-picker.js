const merchantSelect = document.getElementById('merchant-select');
const categorySelect = document.getElementById('category-select');
const amountInput = document.getElementById('spend-amount');
const resultsEl = document.getElementById('picker-results');
const hintEl = document.getElementById('picker-hint');
const FALLBACK_CATEGORIES = ['Shopping', 'Dining', 'Groceries', 'Entertainment', 'Travel', 'Other'];

Promise.all([
  fetch('/api/offers').then(r => r.json()),
  fetch('/api/merchants').then(r => r.ok ? r.json() : [])
]).then(([offers, merchants]) => {
  const offerList = Array.isArray(offers) ? offers : [];
  const merchantList = Array.isArray(merchants) ? merchants : [];
  const names = [...new Set([
    ...merchantList.map(m => m.name).filter(Boolean),
    ...offerList.map(o => o.merchant).filter(Boolean)
  ])].sort();
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    merchantSelect.appendChild(opt);
  });

  const cats = [...new Set([
    ...FALLBACK_CATEGORIES,
    ...merchantList.map(m => m.category).filter(Boolean),
    ...offerList.map(o => o.category).filter(Boolean)
  ])].sort();
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}).catch(err => {
  console.error(err);
  showToast('Could not load merchants. Is Flask running?', 'error');
});

document.getElementById('picker-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const merchant = merchantSelect.value;
  const category = categorySelect.value;
  const amount = amountInput.value;

  if (!merchant && !category) {
    showToast('Pick a merchant or a category', 'error');
    return;
  }

  const params = new URLSearchParams();
  if (merchant) params.set('merchant', merchant);
  if (category) params.set('category', category);
  if (amount) params.set('amount', amount);

  resultsEl.innerHTML = '<div class="loading-state"><div class="spinner"></div> Ranking cards...</div>';

  fetch(`/api/recommend?${params.toString()}`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        resultsEl.innerHTML = '';
        showToast(data.error, 'error');
        return;
      }
      renderResults(data);
    })
    .catch(err => {
      console.error(err);
      resultsEl.innerHTML = '';
      showToast('Could not rank cards. Is Flask running?', 'error');
    });
});

function renderResults(data) {
  const cards = data.cards || [];
  if (data.emptyReason) {
    hintEl.textContent = '';
    resultsEl.innerHTML = `<p class="picker-empty">${data.emptyReason}</p>`;
    return;
  }

  if (data.usedWallet) {
    hintEl.textContent = 'Ranking your saved cards. Save more cards on Card Perks to widen the comparison.';
  } else {
    hintEl.textContent = 'No saved cards yet — ranking every card in the catalog. Log in and save cards to personalize this.';
  }

  if (cards.length === 0) {
    resultsEl.innerHTML = '<p class="picker-empty">No cards to rank.</p>';
    return;
  }

  resultsEl.innerHTML = '';
  cards.forEach((card, index) => {
    const el = document.createElement('div');
    el.className = 'rank-card' + (index === 0 ? ' top-pick' : '');
    const offerLink = card.offerId
      ? `<div class="rank-actions"><a href="offer-detail.html?offerId=${card.offerId}">View offer &amp; redeem &rarr;</a></div>`
      : '';
    el.innerHTML = `
      <div class="rank-badge">${index + 1}</div>
      <div>
        <div class="rank-title">${index === 0 ? 'Use this: ' : ''}${card.network} ${card.tier}</div>
        <div class="rank-meta">${card.bankName} &middot; ${card.type} &middot; ${card.cashback} cashback</div>
        <div class="rank-reason">${card.reason}</div>
        ${offerLink}
      </div>
      <div class="rank-savings">
        <strong>${Number(card.estimatedSavings).toFixed(2)} BDT</strong>
        <span>estimated savings</span>
      </div>
    `;
    resultsEl.appendChild(el);
  });
}
