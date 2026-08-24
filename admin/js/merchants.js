const API = '/api/admin';
let merchantsCache = [];

const merchantModal = document.getElementById('merchant-modal');
const merchantForm = document.getElementById('merchant-form');
const merchantNameInput = document.getElementById('merchant-name-input');
const merchantCategoryInput = document.getElementById('merchant-category-input');
const merchantDescriptionInput = document.getElementById('merchant-description-input');
const merchantAddressInput = document.getElementById('merchant-address-input');
const merchantEditingId = document.getElementById('merchant-editing-id');
const merchantModalTitle = document.getElementById('merchant-modal-title');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadMerchants() {
  fetch(`${API}/merchants`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      merchantsCache = data;
      renderMerchants(data);
    })
    .catch(err => {
      console.error('Failed to load merchants:', err);
      document.getElementById('merchants-tbody').innerHTML =
        `<tr class="empty-row"><td colspan="5">Could not load merchants. Is Flask running?</td></tr>`;
    });
}

function renderMerchants(merchants) {
  const tbody = document.getElementById('merchants-tbody');

  if (!merchants.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No merchants yet. Click "Add Merchant" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = merchants.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.category)}</td>
      <td class="cell-muted">${escapeHtml(m.description)}</td>
      <td class="cell-muted">${escapeHtml(m.address)}</td>
      <td class="col-actions">
        <button class="btn-sm btn-edit" data-edit="${m.id}">Edit</button>
        <button class="btn-sm btn-delete" data-delete="${m.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openAddMerchant() {
  merchantModalTitle.textContent = 'Add Merchant';
  merchantForm.reset();
  merchantEditingId.value = '';
  merchantModal.classList.remove('hidden');
}

function openEditMerchant(id) {
  const merchant = merchantsCache.find(m => m.id === Number(id));
  if (!merchant) return;

  merchantModalTitle.textContent = 'Edit Merchant';
  merchantEditingId.value = merchant.id;
  merchantNameInput.value = merchant.name || '';
  merchantCategoryInput.value = merchant.category || '';
  merchantDescriptionInput.value = merchant.description || '';
  merchantAddressInput.value = merchant.address || '';
  merchantModal.classList.remove('hidden');
}

function closeMerchantModal() {
  merchantModal.classList.add('hidden');
}

function deleteMerchant(id) {
  if (!confirm('Delete this merchant?')) return;

  fetch(`${API}/merchants/${id}`, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Merchant deleted', 'success');
        loadMerchants();
      } else {
        showToast(data.error || 'Could not delete merchant', 'error');
      }
    })
    .catch(err => {
      showToast('Could not reach server', 'error');
      console.error(err);
    });
}

document.getElementById('add-merchant-btn').addEventListener('click', openAddMerchant);
document.getElementById('merchant-cancel-btn').addEventListener('click', closeMerchantModal);

document.getElementById('merchants-tbody').addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const deleteId = e.target.getAttribute('data-delete');
  if (editId) openEditMerchant(editId);
  if (deleteId) deleteMerchant(deleteId);
});

merchantForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const editingId = merchantEditingId.value;
  const name = merchantNameInput.value.trim();

  if (!name) {
    showToast('Merchant name is required', 'error');
    return;
  }

  const payload = {
    name,
    category: merchantCategoryInput.value.trim(),
    description: merchantDescriptionInput.value.trim(),
    address: merchantAddressInput.value.trim()
  };

  const isEdit = !!editingId;
  const url = isEdit ? `${API}/merchants/${editingId}` : `${API}/merchants`;
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
      showToast(isEdit ? 'Merchant updated' : 'Merchant added', 'success');
      closeMerchantModal();
      loadMerchants();
    } else {
      showToast(data.error || 'Could not save merchant', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server', 'error');
    console.error(err);
  });
});

loadMerchants();
