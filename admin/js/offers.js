const API = '/api/admin';
let offersCache = [];
let banksCache = [];

const offerModal = document.getElementById('offer-modal');
const offerForm = document.getElementById('offer-form');
const offerModalTitle = document.getElementById('offer-modal-title');
const offerEditingId = document.getElementById('offer-editing-id');
const titleInput = document.getElementById('offer-title-input');
const merchantInput = document.getElementById('offer-merchant-input');
const categoryInput = document.getElementById('offer-category-input');
const discountInput = document.getElementById('offer-discount-input');
const bankSelect = document.getElementById('offer-bank-select');
const validUntilInput = document.getElementById('offer-valid-until-input');
const descriptionInput = document.getElementById('offer-description-input');
const minSpendInput = document.getElementById('offer-min-spend-input');
const capInput = document.getElementById('offer-cap-input');
const cardTypeSelect = document.getElementById('offer-card-type-select');
const termsInput = document.getElementById('offer-terms-input');

function loadBanksForDropdown() {
  fetch(`${API}/banks`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      banksCache = data;
      bankSelect.innerHTML = data.map(b => `<option value="${escapeAttr(b.id)}">${escapeHtml(b.name)}</option>`).join('');
    })
    .catch(err => console.error('Failed to load banks for dropdown:', err));
}

function loadOffers() {
  fetch(`${API}/offers`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      offersCache = data;
      renderOffers(data);
    })
    .catch(err => {
      console.error('Failed to load offers:', err);
      document.getElementById('offers-tbody').innerHTML =
        `<tr class="empty-row"><td colspan="8">Could not load offers. Is Flask running?</td></tr>`;
    });
}

function renderOffers(offers) {
  const tbody = document.getElementById('offers-tbody');

  if (!offers.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No offers yet. Click "Add Offer" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = offers.map(o => `
    <tr>
      <td>${escapeHtml(o.title)}</td>
      <td>${escapeHtml(o.merchant)}</td>
      <td class="cell-muted">${escapeHtml(o.bankName)}</td>
      <td>${escapeHtml(o.discount)}</td>
      <td class="cell-muted">${offerConditions(o)}</td>
      <td class="cell-muted">${escapeHtml(o.validUntil)}</td>
      <td>${o.isExpired ? '<span class="badge badge-no">Expired</span>' : '<span class="badge badge-yes">Active</span>'}</td>
      <td class="col-actions">
        <button class="btn-sm btn-edit" data-edit="${o.id}">Edit</button>
        <button class="btn-sm btn-delete" data-delete="${o.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function offerConditions(offer) {
  const parts = [];
  if (Number(offer.minSpend) > 0) parts.push(`Min ${Number(offer.minSpend).toLocaleString()} BDT`);
  if (offer.discountCap !== null && offer.discountCap !== undefined) parts.push(`Cap ${Number(offer.discountCap).toLocaleString()} BDT`);
  if (offer.eligibleCardType && offer.eligibleCardType !== 'Any') parts.push(`${offer.eligibleCardType} only`);
  return parts.length ? parts.map(escapeHtml).join('<br>') : 'No extra limits';
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

function openAddOffer() {
  offerModalTitle.textContent = 'Add Offer';
  offerForm.reset();
  offerEditingId.value = '';
  offerModal.classList.remove('hidden');
}

function openEditOffer(id) {
  const offer = offersCache.find(o => o.id === id);
  if (!offer) return;

  offerModalTitle.textContent = 'Edit Offer';
  offerEditingId.value = offer.id;
  titleInput.value = offer.title;
  merchantInput.value = offer.merchant;
  categoryInput.value = offer.category;
  discountInput.value = offer.discount;
  bankSelect.value = offer.bankId;
  validUntilInput.value = offer.validUntil;
  descriptionInput.value = offer.description;
  minSpendInput.value = offer.minSpend || 0;
  capInput.value = offer.discountCap ?? '';
  cardTypeSelect.value = offer.eligibleCardType || 'Any';
  termsInput.value = offer.terms || '';
  offerModal.classList.remove('hidden');
}

function closeOfferModal() {
  offerModal.classList.add('hidden');
}

function deleteOffer(id) {
  if (!confirm('Delete this offer? This cannot be undone.')) return;

  fetch(`${API}/offers/${id}`, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Offer deleted', 'success');
        loadOffers();
      } else {
        showToast(data.error || 'Could not delete offer', 'error');
      }
    })
    .catch(err => {
      showToast('Could not reach server', 'error');
      console.error(err);
    });
}

document.getElementById('add-offer-btn').addEventListener('click', openAddOffer);
document.getElementById('offer-cancel-btn').addEventListener('click', closeOfferModal);

document.getElementById('offers-tbody').addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const deleteId = e.target.getAttribute('data-delete');
  if (editId) openEditOffer(parseInt(editId));
  if (deleteId) deleteOffer(parseInt(deleteId));
});

offerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const editingId = offerEditingId.value;
  const payload = {
    title: titleInput.value.trim(),
    merchant: merchantInput.value.trim(),
    category: categoryInput.value.trim(),
    discount: discountInput.value.trim(),
    bankId: bankSelect.value,
    validUntil: validUntilInput.value,
    description: descriptionInput.value.trim(),
    minSpend: minSpendInput.value || 0,
    discountCap: capInput.value || null,
    eligibleCardType: cardTypeSelect.value,
    terms: termsInput.value.trim()
  };

  if (!payload.title || !payload.merchant || !payload.bankId || !payload.validUntil) {
    showToast('Title, merchant, bank, and validity date are required', 'error');
    return;
  }

  const isEdit = !!editingId;
  const url = isEdit ? `${API}/offers/${editingId}` : `${API}/offers`;
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(isEdit ? 'Offer updated' : 'Offer added', 'success');
      closeOfferModal();
      loadOffers();
    } else {
      showToast(data.error || 'Could not save offer', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server', 'error');
    console.error(err);
  });
});

loadBanksForDropdown();
loadOffers();
