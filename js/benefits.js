let offersData = [];

const offersGrid = document.getElementById('offers-grid');
const filterBar = document.getElementById('filter-bar');

fetch('http://localhost:5000/api/offers')
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
    card.innerHTML = `
      <span class="offer-category">${offer.category}</span>
      <h3>${offer.title}</h3>
      <p class="offer-merchant">${offer.merchant}</p>
      <p class="offer-discount">${offer.discount}</p>
      <p class="offer-desc">${offer.description}</p>
      <div class="offer-footer">
        <span>${offer.bankName}</span>
        <span>Valid until ${offer.validUntil}</span>
      </div>
    `;
    offersGrid.appendChild(card);
  });
}