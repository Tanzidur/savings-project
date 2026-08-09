const params = new URLSearchParams(window.location.search);
const offerId = params.get('offerId');

const box = document.getElementById('offer-detail-box');

fetch('/api/offers')
  .then(res => res.json())
  .then(offers => {
    const offer = offers.find(o => o.id == offerId);

    if (!offer) {
      box.innerHTML = '<p class="loading-msg">Offer not found.</p>';
      return;
    }

    box.innerHTML = `
      <span class="detail-category">${offer.category}</span>
      <h1 class="detail-title">${offer.title}</h1>
      <p class="detail-merchant">${offer.merchant}</p>
      <p class="detail-discount">${offer.discount}</p>
      <p class="detail-desc">${offer.description}</p>
      <div class="detail-meta">
        <div><span class="detail-meta-label">Bank</span>${offer.bankName}</div>
        <div><span class="detail-meta-label">Valid Until</span>${offer.validUntil}</div>
      </div>
      <a href="payout.html?offerId=${offer.id}" class="btn-primary">Pay / Redeem This Offer</a>
    `;
  })
  .catch(err => {
    box.innerHTML = '<p class="loading-msg">Could not load offer. Is Flask running?</p>';
    console.error(err);
  });