const API = '/api/admin';
let banksCache = [];

const bankModal = document.getElementById('bank-modal');
const bankForm = document.getElementById('bank-form');
const bankIdInput = document.getElementById('bank-id-input');
const bankNameInput = document.getElementById('bank-name-input');
const bankEditingId = document.getElementById('bank-editing-id');
const bankModalTitle = document.getElementById('bank-modal-title');

function loadBanks() {
  fetch(`${API}/banks`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      banksCache = data;
      renderBanks(data);
    })
    .catch(err => {
      console.error('Failed to load banks:', err);
      document.getElementById('banks-tbody').innerHTML =
        `<tr class="empty-row"><td colspan="4">Could not load banks. Is Flask running?</td></tr>`;
    });
}

function renderBanks(banks) {
  const tbody = document.getElementById('banks-tbody');

  if (!banks.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No banks yet. Click "Add Bank" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = banks.map(b => `
    <tr>
      <td>${escapeHtml(b.id)}</td>
      <td>${escapeHtml(b.name)}</td>
      <td class="cell-muted">${b.cardCount} card${b.cardCount === 1 ? '' : 's'}</td>
      <td class="col-actions">
        <button class="btn-sm btn-edit" data-edit="${escapeAttr(b.id)}">Edit</button>
        <button class="btn-sm btn-delete" data-delete="${escapeAttr(b.id)}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

function openAddBank() {
  bankModalTitle.textContent = 'Add Bank';
  bankForm.reset();
  bankEditingId.value = '';
  bankIdInput.disabled = false;
  bankModal.classList.remove('hidden');
}

function openEditBank(id) {
  const bank = banksCache.find(b => b.id === id);
  if (!bank) return;

  bankModalTitle.textContent = 'Edit Bank';
  bankEditingId.value = bank.id;
  bankIdInput.value = bank.id;
  bankIdInput.disabled = true;
  bankNameInput.value = bank.name;
  bankModal.classList.remove('hidden');
}

function closeBankModal() {
  bankModal.classList.add('hidden');
}

function deleteBank(id) {
  if (!confirm('Delete this bank? This will fail if any cards or offers still reference it.')) return;

  fetch(`${API}/banks/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Bank deleted', 'success');
        loadBanks();
      } else {
        showToast(data.error || 'Could not delete bank', 'error');
      }
    })
    .catch(err => {
      showToast('Could not reach server', 'error');
      console.error(err);
    });
}

document.getElementById('add-bank-btn').addEventListener('click', openAddBank);
document.getElementById('bank-cancel-btn').addEventListener('click', closeBankModal);

document.getElementById('banks-tbody').addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const deleteId = e.target.getAttribute('data-delete');
  if (editId) openEditBank(editId);
  if (deleteId) deleteBank(deleteId);
});

bankForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const editingId = bankEditingId.value;
  const id = bankIdInput.value.trim();
  const name = bankNameInput.value.trim();

  if (!id || !name) {
    showToast('Bank ID and name are required', 'error');
    return;
  }

  const isEdit = !!editingId;
  const url = isEdit ? `${API}/banks/${encodeURIComponent(editingId)}` : `${API}/banks`;
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, name })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(isEdit ? 'Bank updated' : 'Bank added', 'success');
      closeBankModal();
      loadBanks();
    } else {
      showToast(data.error || 'Could not save bank', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server', 'error');
    console.error(err);
  });
});

loadBanks();
