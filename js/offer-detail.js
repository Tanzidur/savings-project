const params = new URLSearchParams(window.location.search);
const offerId = params.get('offerId');

const box = document.getElementById('offer-detail-box');

Promise.all([
  fetch('/api/offers').then(res => res.json()),
  fetch('/api/session', { credentials: 'include' }).then(res => res.json()),
  fetch('/api/watchlist', { credentials: 'include' }).then(res => res.ok ? res.json() : { offerIds: [] }),
  fetch('/api/my-cards', { credentials: 'include' }).then(res => res.ok ? res.json() : [])
]).then(([offers, session, watch, cards]) => {
  const offer = offers.find(o => o.id == offerId);

  if (!offer) {
    box.innerHTML = '<p class="loading-msg">Offer not found.</p>';
    return;
  }

  const loggedIn = !!(session && session.loggedIn);
  const watched = ((watch && watch.offerIds) || []).map(Number).includes(Number(offer.id));
  const eligibleCards = (cards || []).filter(c => c.bankId === offer.bankId);
  const canRedeem = !offer.isExpired && loggedIn && eligibleCards.length > 0;

  let redeemBlock;
  if (offer.isExpired) {
    redeemBlock = '<button class="btn-primary" disabled style="opacity:0.5; cursor:not-allowed;">Offer Expired</button>';
  } else if (!loggedIn) {
    redeemBlock = `<a href="login.html" class="btn-primary">Log in to redeem</a>
      <p class="redeem-hint">This deal requires a saved ${offer.bankName} card.</p>`;
  } else if (!canRedeem) {
    redeemBlock = `<a href="card-selection.html" class="btn-primary">Save a ${offer.bankName} card to redeem</a>
      <p class="redeem-hint">Offers are bank-specific. Add a ${offer.bankName} card on Card Perks first.</p>`;
  } else {
    redeemBlock = `<a href="payout.html?offerId=${offer.id}" class="btn-primary">Pay / Redeem This Offer</a>`;
  }

  box.innerHTML = `
    <span class="detail-category">${offer.category}</span>
    ${offer.isExpired ? '<span class="expired-badge">Expired</span>' : ''}
    <h1 class="detail-title">${offer.title}</h1>
    <p class="detail-merchant">${offer.merchant}</p>
    <p class="detail-discount">${offer.discount}</p>
    <p class="detail-desc">${offer.description}</p>
    <div class="detail-meta">
      <div><span class="detail-meta-label">Bank</span>${offer.bankName}</div>
      <div><span class="detail-meta-label">Valid Until</span>${offer.validUntil}</div>
    </div>
    <button type="button" class="watch-detail-btn${watched ? ' watched' : ''}" id="watch-detail-btn">
      ${watched ? '★ Watching' : '☆ Watch this offer'}
    </button>
    ${redeemBlock}
  `;

  document.getElementById('watch-detail-btn').addEventListener('click', () => {
    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }
    const btn = document.getElementById('watch-detail-btn');
    const currently = btn.classList.contains('watched');
    const req = currently
      ? fetch(`/api/watchlist/${offer.id}`, { method: 'DELETE', credentials: 'include' })
      : fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ offerId: offer.id })
        });
    req.then(r => r.json()).then(data => {
      if (data.error && data.success === false) {
        showToast(data.error, 'error');
        return;
      }
      if (currently) {
        btn.classList.remove('watched');
        btn.textContent = '☆ Watch this offer';
        showToast('Removed from watchlist', 'success');
      } else {
        btn.classList.add('watched');
        btn.textContent = '★ Watching';
        showToast('Watching this offer', 'success');
      }
    }).catch(() => showToast('Could not update watchlist', 'error'));
  });
})
.catch(err => {
  box.innerHTML = '<p class="loading-msg">Could not load offer. Is Flask running?</p>';
  console.error(err);
});
