const API = '/api/admin';
let cardsCache = [];
let banksForSelect = [];

const cardModal = document.getElementById('card-modal');
const cardForm = document.getElementById('card-form');
const cardIdInput = document.getElementById('card-id-input');
const cardBankSelect = document.getElementById('card-bank-select');
const cardNetworkInput = document.getElementById('card-network-input');
const cardTypeSelect = document.getElementById('card-type-select');
const cardTierInput = document.getElementById('card-tier-input');
const cardCashbackInput = document.getElementById('card-cashback-input');
const cardAnnualFeeInput = document.getElementById('card-annual-fee-input');
const cardRewardPointsInput = document.getElementById('card-reward-points-input');
const cardEmiCheckbox = document.getElementById('card-emi-checkbox');
const cardEditingId = document.getElementById('card-editing-id');
const cardModalTitle = document.getElementById('card-modal-title');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadBanksForSelect() {
  return fetch(`${API}/banks`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      banksForSelect = data;
      cardBankSelect.innerHTML = data.map(b =>
        `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`
      ).join('');
    });
}

function loadCards() {
  fetch(`${API}/cards`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      cardsCache = data;
      renderCards(data);
    })
    .catch(err => {
      console.error('Failed to load cards:', err);
      document.getElementById('cards-tbody').innerHTML =
        `<tr class="empty-row"><td colspan="10">Could not load cards. Is Flask running?</td></tr>`;
    });
}

function renderCards(cards) {
  const tbody = document.getElementById('cards-tbody');

  if (!cards.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="10">No cards yet. Click "Add Card" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = cards.map(c => `
    <tr>
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.bankName)}</td>
      <td>${escapeHtml(c.network)}</td>
      <td>${escapeHtml(c.type)}</td>
      <td>${escapeHtml(c.tier)}</td>
      <td>${escapeHtml(c.cashback)}</td>
      <td class="cell-muted">${escapeHtml(c.rewardPoints)}</td>
      <td><span class="badge ${c.emi ? 'badge-yes' : 'badge-no'}">${c.emi ? 'Yes' : 'No'}</span></td>
      <td>${escapeHtml(c.annualFee)}</td>
      <td class="col-actions">
        <button class="btn-sm btn-edit" data-edit="${escapeHtml(c.id)}">Edit</button>
        <button class="btn-sm btn-delete" data-delete="${escapeHtml(c.id)}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openAddCard() {
  cardModalTitle.textContent = 'Add Card';
  cardForm.reset();
  cardEditingId.value = '';
  cardIdInput.disabled = false;
  if (banksForSelect.length) cardBankSelect.value = banksForSelect[0].id;
  cardModal.classList.remove('hidden');
}

function openEditCard(id) {
  const card = cardsCache.find(c => c.id === id);
  if (!card) return;

  cardModalTitle.textContent = 'Edit Card';
  cardEditingId.value = card.id;
  cardIdInput.value = card.id;
  cardIdInput.disabled = true;
  cardBankSelect.value = card.bankId;
  cardNetworkInput.value = card.network || '';
  cardTypeSelect.value = card.type || 'Debit';
  cardTierInput.value = card.tier || '';
  cardCashbackInput.value = card.cashback || '';
  cardAnnualFeeInput.value = card.annualFee || '';
  cardRewardPointsInput.value = card.rewardPoints || '';
  cardEmiCheckbox.checked = !!card.emi;
  cardModal.classList.remove('hidden');
}

function closeCardModal() {
  cardModal.classList.add('hidden');
}

function deleteCard(id) {
  if (!confirm('Delete this card? This will fail if any users have saved it to "My Cards".')) return;

  fetch(`${API}/cards/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Card deleted', 'success');
        loadCards();
      } else {
        showToast(data.error || 'Could not delete card', 'error');
      }
    })
    .catch(err => {
      showToast('Could not reach server', 'error');
      console.error(err);
    });
}

document.getElementById('add-card-btn').addEventListener('click', openAddCard);
document.getElementById('card-cancel-btn').addEventListener('click', closeCardModal);

document.getElementById('cards-tbody').addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const deleteId = e.target.getAttribute('data-delete');
  if (editId) openEditCard(editId);
  if (deleteId) deleteCard(deleteId);
});

cardForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const editingId = cardEditingId.value;
  const id = cardIdInput.value.trim();
  const bankId = cardBankSelect.value;

  if (!id || !bankId) {
    showToast('Card ID and bank are required', 'error');
    return;
  }

  const payload = {
    id,
    bankId,
    network: cardNetworkInput.value.trim(),
    type: cardTypeSelect.value,
    tier: cardTierInput.value.trim(),
    cashback: cardCashbackInput.value.trim(),
    annualFee: cardAnnualFeeInput.value.trim(),
    rewardPoints: cardRewardPointsInput.value.trim(),
    emi: cardEmiCheckbox.checked
  };

  const isEdit = !!editingId;
  const url = isEdit ? `${API}/cards/${encodeURIComponent(editingId)}` : `${API}/cards`;
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
      showToast(isEdit ? 'Card updated' : 'Card added', 'success');
      closeCardModal();
      loadCards();
    } else {
      showToast(data.error || 'Could not save card', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server', 'error');
    console.error(err);
  });
});

loadBanksForSelect().then(loadCards);
