let offersData = [];
let merchantsData = [];

const offersView = document.getElementById('offers-view');
const merchantsView = document.getElementById('merchants-view');
const offersGrid = document.getElementById('offers-grid');
const filterBar = document.getElementById('filter-bar');
const merchantGrid = document.getElementById('merchant-grid');
const merchantSearch = document.getElementById('merchant-search');

// Load offers
fetch('/api/offers')
  .then(response => response.json())
  .then(data => {
    offersData = data;
    renderFilterButtons();
    renderOffers(offersData);
  })
  .catch(error => {
    offersGrid.innerHTML = '<p class="loading-msg">Could not load offers. Is Flask running?</p>';
    console.error('Error loading offers:', error);
  });

// Load merchants
fetch('/api/merchants')
  .then(response => response.json())
  .then(data => {
    merchantsData = data;
    renderMerchants(merchantsData);
  })
  .catch(error => {
    merchantGrid.innerHTML = '<p class="loading-msg">Could not load merchants. Is Flask running?</p>';
    console.error('Error loading merchants:', error);
  });

// ---------- VIEW SWITCHING ----------
function showOffersView(resetFilter) {
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="offers"]').classList.add('active');
  offersView.classList.remove('hidden');
  merchantsView.classList.add('hidden');

  if (resetFilter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-category="All"]');
    if (allBtn) allBtn.classList.add('active');
    renderOffers(offersData);
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

// ---------- OFFERS ----------
function renderFilterButtons() {
  const categories = ['All', ...new Set(offersData.map(o => o.category))];

  filterBar.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filtered = cat === 'All' ? offersData : offersData.filter(o => o.category === cat);
      renderOffers(filtered);
    });
    filterBar.appendChild(btn);
  });
}

function renderOffers(offers) {
  offersGrid.innerHTML = '';

  if (offers.length === 0) {
    offersGrid.innerHTML = '<p class="loading-msg">No offers in this category.</p>';
    return;
  }

  offers.forEach(offer => {
    const card = document.createElement('div');
    card.className = 'offer-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
    <span class="offer-category">${offer.category}</span>
    <h3>${offer.title}</h3>
    <p class="offer-merchant">${offer.merchant}</p>
    <p class="offer-discount">${offer.discount}</p>
    <span class="view-details-link">View Details &rarr;</span>
    `;
    card.addEventListener('click', () => {
      window.location.href = `offer-detail.html?offerId=${offer.id}`;
    });
    offersGrid.appendChild(card);
  });
}

// ---------- MERCHANTS ----------
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
      const filtered = offersData.filter(o => o.merchant === m.name);
      showOffersView(false);
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      renderOffers(filtered.length > 0 ? filtered : offersData);
    });

    merchantGrid.appendChild(card);
  });
}

merchantSearch.addEventListener('input', () => {
  const query = merchantSearch.value.toLowerCase();
  const filtered = merchantsData.filter(m =>
    m.name.toLowerCase().includes(query) || m.category.toLowerCase().includes(query)
  );
  renderMerchants(filtered);
});