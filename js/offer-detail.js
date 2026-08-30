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
  const typeEligibleCards = eligibleCards.filter(c =>
    offer.eligibleCardType === 'Any' || c.type === offer.eligibleCardType
  );
  const canRedeem = !offer.isExpired && loggedIn && typeEligibleCards.length > 0;

  const rules = [
    { label: 'Offer is active', passed: !offer.isExpired, detail: `Valid until ${offer.validUntil}` },
    { label: 'Partner-bank card', passed: loggedIn ? eligibleCards.length > 0 : null, detail: `${offer.bankName} card required` },
    ...(offer.eligibleCardType !== 'Any' ? [{
      label: `${offer.eligibleCardType} card type`,
      passed: loggedIn ? typeEligibleCards.length > 0 : null,
      detail: `${offer.eligibleCardType} card required`
    }] : []),
    ...(Number(offer.minSpend) > 0 ? [{
      label: 'Minimum spend', passed: null, detail: `Minimum ${Number(offer.minSpend).toLocaleString()} BDT`
    }] : [])
  ];
  const checklistHtml = rules.map(rule => {
    const icon = rule.passed === true ? '✓' : rule.passed === false ? '×' : '•';
    const state = rule.passed === true ? 'pass' : rule.passed === false ? 'fail' : 'info';
    return `<li class="eligibility-${state}"><span>${icon}</span><div><strong>${rule.label}</strong><small>${rule.detail}</small></div></li>`;
  }).join('');

  let redeemBlock;
  if (offer.isExpired) {
    redeemBlock = '<button class="btn-primary" disabled style="opacity:0.5; cursor:not-allowed;">Offer Expired</button>';
  } else if (!loggedIn) {
    redeemBlock = `<a href="login.html" class="btn-primary">Log in to redeem</a>
      <p class="redeem-hint">This deal requires a saved ${offer.bankName} card.</p>`;
  } else if (!canRedeem) {
    redeemBlock = `<a href="card-selection.html" class="btn-primary">Save a ${offer.bankName} card to redeem</a>
      <p class="redeem-hint">Save an eligible ${offer.eligibleCardType === 'Any' ? '' : offer.eligibleCardType + ' '}${offer.bankName} card on Card Perks first.</p>`;
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
    <section class="eligibility-box">
      <h2>Eligibility checklist</h2>
      <ul>${checklistHtml}</ul>
    </section>
    ${offer.discountCap !== null ? `<p class="offer-condition">Maximum discount: <strong>${Number(offer.discountCap).toLocaleString()} BDT</strong></p>` : ''}
    ${offer.terms ? `<section class="terms-box"><h2>Terms & Conditions</h2><p>${offer.terms}</p></section>` : ''}
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
