let offersData = [];
let merchantsData = [];
let watchedIds = new Set();
let savedBankIds = new Set();
let currentCategory = 'All';
let loggedIn = false;

const offersView = document.getElementById('offers-view');
const merchantsView = document.getElementById('merchants-view');
const offersGrid = document.getElementById('offers-grid');
const filterBar = document.getElementById('filter-bar');
const merchantGrid = document.getElementById('merchant-grid');
const merchantSearch = document.getElementById('merchant-search');
const offerSearch = document.getElementById('offer-search');
const forYouToggle = document.getElementById('for-you-toggle');
const showExpiredToggle = document.getElementById('show-expired-toggle');

Promise.all([
  fetch('/api/offers').then(r => r.json()),
  fetch('/api/session', { credentials: 'include' }).then(r => r.json()),
  fetch('/api/my-cards', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
  fetch('/api/watchlist', { credentials: 'include' }).then(r => r.ok ? r.json() : { offerIds: [] })
]).then(([offers, session, cards, watch]) => {
  offersData = offers;
  loggedIn = !!(session && session.loggedIn);
  savedBankIds = new Set((cards || []).map(c => c.bankId).filter(Boolean));
  watchedIds = new Set((watch && watch.offerIds) || []);
  renderFilterButtons();
  applyOfferFilters();
  renderMerchantDirectory();
}).catch(error => {
  offersGrid.innerHTML = '<p class="loading-msg">Could not load offers. Is Flask running?</p>';
  console.error('Error loading offers:', error);
});

fetch('/api/merchants')
  .then(response => response.json())
  .then(data => {
    merchantsData = data;
    renderMerchantDirectory();
  })
  .catch(error => {
    merchantGrid.innerHTML = '<p class="loading-msg">Could not load merchants. Is Flask running?</p>';
    console.error('Error loading merchants:', error);
  });

function showOffersView(resetFilter) {
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="offers"]').classList.add('active');
  offersView.classList.remove('hidden');
  merchantsView.classList.add('hidden');

  if (resetFilter) {
    currentCategory = 'All';
    offerSearch.value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-category="All"]');
    if (allBtn) allBtn.classList.add('active');
    applyOfferFilters();
  }
}

function showMerchantsView() {
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="merchants"]').classList.add('active');
  merchantsView.classList.remove('hidden');
  offersView.classList.add('hidden');
}

document.querySelector('[data-view="offers"]').addEventListener('click', () => {
  showOffersView(true);
});

document.querySelector('[data-view="merchants"]').addEventListener('click', () => {
  showMerchantsView();
});

function renderFilterButtons() {
  const categories = ['All', ...new Set(offersData.map(o => o.category))];

  filterBar.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === currentCategory ? ' active' : '');
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = cat;
      applyOfferFilters();
    });
    filterBar.appendChild(btn);
  });
}

function applyOfferFilters(merchantName) {
  const query = (offerSearch.value || '').toLowerCase().trim();
  const forYou = forYouToggle.checked;
  const showExpired = showExpiredToggle.checked;

  let filtered = offersData.filter(o => {
    if (currentCategory !== 'All' && o.category !== currentCategory) return false;
    if (merchantName && o.merchant !== merchantName) return false;
    if (!showExpired && o.isExpired) return false;
    if (forYou) {
      if (!loggedIn) return false;
      if (savedBankIds.size === 0) return false;
      if (!savedBankIds.has(o.bankId)) return false;
    }
    if (query) {
      const hay = `${o.title} ${o.merchant} ${o.bankName}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (forYou && loggedIn && savedBankIds.size === 0) {
    offersGrid.innerHTML = '<p class="loading-msg">Save a card on Card Perks to see personalized deals.</p>';
    return;
  }
  if (forYou && !loggedIn) {
    offersGrid.innerHTML = '<p class="loading-msg">Log in and save a card to use For You.</p>';
    return;
  }

  renderOffers(filtered);
}

offerSearch.addEventListener('input', () => applyOfferFilters());
forYouToggle.addEventListener('change', () => applyOfferFilters());
showExpiredToggle.addEventListener('change', () => applyOfferFilters());

function renderOffers(offers) {
  offersGrid.innerHTML = '';

  if (offers.length === 0) {
    offersGrid.innerHTML = '<p class="loading-msg">No offers match these filters.</p>';
    return;
  }

  const sorted = [...offers].sort((a, b) => {
    if (a.isExpired !== b.isExpired) return a.isExpired - b.isExpired;
    return String(a.validUntil).localeCompare(String(b.validUntil));
  });

  sorted.forEach(offer => {
    const card = document.createElement('div');
    const watched = watchedIds.has(offer.id);
    card.className = 'offer-card' + (offer.isExpired ? ' offer-expired' : '');
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <button class="watch-btn${watched ? ' watched' : ''}" data-offer-id="${offer.id}" title="Watch this offer" aria-label="Watch this offer">${watched ? '★' : '☆'}</button>
      <span class="offer-category">${offer.category}</span>
      ${offer.isExpired ? '<span class="expired-badge">Expired</span>' : ''}
      <h3>${offer.title}</h3>
      <p class="offer-merchant">${offer.merchant} &middot; ${offer.bankName}</p>
      <p class="offer-discount">${offer.discount}</p>
      <span class="view-details-link">View Details &rarr;</span>
    `;
    card.addEventListener('click', () => {
      window.location.href = `offer-detail.html?offerId=${offer.id}`;
    });
    card.querySelector('.watch-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWatch(offer.id, e.currentTarget);
    });
    offersGrid.appendChild(card);
  });
}

function toggleWatch(offerId, btn) {
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const watching = watchedIds.has(offerId);
  const req = watching
    ? fetch(`/api/watchlist/${offerId}`, { method: 'DELETE', credentials: 'include' })
    : fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId })
      });

  req.then(res => res.json()).then(data => {
    if (data.error && !data.success) {
      showToast(data.error || 'Could not update watchlist', 'error');
      return;
    }
    if (watching) {
      watchedIds.delete(offerId);
      btn.classList.remove('watched');
      btn.textContent = '☆';
      showToast('Removed from watchlist', 'success');
    } else {
      watchedIds.add(offerId);
      btn.classList.add('watched');
      btn.textContent = '★';
      showToast('Watching this offer', 'success');
    }
  }).catch(() => showToast('Could not update watchlist', 'error'));
}

function merchantsWithActiveDeals() {
  const activeNames = [...new Set(offersData.filter(o => !o.isExpired).map(o => o.merchant))];
  const byName = {};
  merchantsData.forEach(m => { byName[m.name] = m; });
  return activeNames.sort().map(name => {
    if (byName[name]) return byName[name];
    const sample = offersData.find(o => o.merchant === name) || {};
    return {
      name,
      category: sample.category || '',
      description: 'Partner merchant with an active card offer',
      address: ''
    };
  });
}

function renderMerchantDirectory(query) {
  const q = (query || '').toLowerCase();
  let list = merchantsWithActiveDeals();
  if (q) {
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)
    );
  }
  renderMerchants(list);
}

function renderMerchants(merchants) {
  merchantGrid.innerHTML = '';

  if (merchants.length === 0) {
    merchantGrid.innerHTML = '<p class="loading-msg">No merchants found.</p>';
    return;
  }

  merchants.forEach(m => {
    const card = document.createElement('div');
    card.className = 'merchant-card';
    card.innerHTML = `
      <span class="merchant-category">${m.category}</span>
      <h3>${m.name}</h3>
      <p class="merchant-desc">${m.description}</p>
      <p class="merchant-address">${m.address}</p>
    `;

    card.addEventListener('click', () => {
      showOffersView(false);
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      const allBtn = document.querySelector('.filter-btn[data-category="All"]');
      if (allBtn) allBtn.classList.add('active');
      currentCategory = 'All';
      offerSearch.value = '';
      applyOfferFilters(m.name);
    });

    merchantGrid.appendChild(card);
  });
}

merchantSearch.addEventListener('input', () => {
  renderMerchantDirectory(merchantSearch.value);
});
