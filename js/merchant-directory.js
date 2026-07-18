let merchantsData = [];

const merchantGrid = document.getElementById('merchant-grid');
const searchInput = document.getElementById('search-input');

fetch('http://localhost:5000/api/merchants')
  .then(response => response.json())
  .then(data => {
    merchantsData = data;
    renderMerchants(merchantsData);
  })
  .catch(error => {
    merchantGrid.innerHTML = '<p class="loading-msg">Could not load merchants. Is Flask running?</p>';
    console.error('Error loading merchants:', error);
  });

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = merchantsData.filter(m =>
    m.name.toLowerCase().includes(query) || m.category.toLowerCase().includes(query)
  );
  renderMerchants(filtered);
});

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
    merchantGrid.appendChild(card);
  });
}