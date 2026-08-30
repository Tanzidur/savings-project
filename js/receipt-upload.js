const fileInput = document.getElementById('receipt-input');
const uploadBox = document.getElementById('upload-box');
const chooseBtn = document.getElementById('choose-file-btn');
const previewImage = document.getElementById('preview-image');
const uploadPrompt = document.getElementById('upload-prompt');
const analyzeBtn = document.getElementById('analyze-btn');
const resultForm = document.getElementById('result-form');
const offerMatch = document.getElementById('offer-match');
const cardSelect = document.getElementById('result-card');

let selectedFile = null;
let matchedOfferId = null;
let matchTimer = null;

chooseBtn.addEventListener('click', event => { event.stopPropagation(); fileInput.click(); });
uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = event => {
    previewImage.src = event.target.result;
    previewImage.classList.remove('hidden');
    uploadPrompt.classList.add('hidden');
    analyzeBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing…';
  const formData = new FormData();
  formData.append('receipt', selectedFile);
  try {
    const response = await fetch('/api/ocr-receipt', { method: 'POST', credentials: 'include', body: formData });
    if (response.status === 401) return window.location.href = 'login.html';
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not read receipt');
    document.getElementById('result-merchant').value = data.data.merchant || '';
    document.getElementById('result-category').value = data.data.category || 'Other';
    document.getElementById('result-amount').value = data.data.amount || '';
    document.getElementById('result-description').value = data.data.description || '';
    resultForm.classList.remove('hidden');
    showToast('Receipt read successfully — reviewing matching offers', 'success');
    await refreshMatches();
  } catch (error) {
    showToast(error.message || 'Could not reach server. Is Flask running?', 'error');
    console.error(error);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Receipt';
  }
});

['result-merchant', 'result-category', 'result-amount'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    clearTimeout(matchTimer);
    matchTimer = setTimeout(refreshMatches, 300);
  });
});
cardSelect.addEventListener('change', refreshMatches);

async function refreshMatches() {
  const merchant = document.getElementById('result-merchant').value.trim();
  const category = document.getElementById('result-category').value;
  const amount = Number(document.getElementById('result-amount').value);
  if (!amount || amount <= 0) return renderMatch(null);
  try {
    const response = await fetch('/api/receipt-offer-match', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, category, amount, cardId: cardSelect.value || null })
    });
    if (response.status === 401) return window.location.href = 'login.html';
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not check offers');
    populateCards(data.cards || []);
    renderMatch(data);
  } catch (error) {
    offerMatch.className = 'offer-match is-none';
    offerMatch.textContent = 'We could not check offers right now. You can still save the transaction.';
    offerMatch.classList.remove('hidden');
  }
}

function populateCards(cards) {
  const selected = cardSelect.value;
  if (cardSelect.dataset.loaded === 'true') return;
  cardSelect.innerHTML = '<option value="">I did not use a saved card</option>';
  cards.forEach(card => {
    const option = document.createElement('option');
    option.value = card.id;
    option.textContent = `${card.bankName} ${card.type} · ${card.network} ${card.tier}`;
    cardSelect.appendChild(option);
  });
  cardSelect.value = selected;
  cardSelect.dataset.loaded = 'true';
}

function renderMatch(data) {
  matchedOfferId = null;
  offerMatch.classList.remove('hidden', 'is-missed', 'is-none');
  if (!data) {
    offerMatch.className = 'offer-match is-none';
    offerMatch.innerHTML = '<h4>Offer check</h4><p>Enter a receipt amount to check available offers.</p>';
    return;
  }
  const used = data.usedOffer;
  const available = data.bestAvailableOffer || data.bestOffer;
  if (used) {
    matchedOfferId = used.id;
    offerMatch.innerHTML = `<h4>Eligible offer used</h4><p>You used <strong>${escapeHtml(used.title)}</strong> — estimated saving: <strong>${money(used.estimatedSavings)} BDT</strong>.</p><p class="match-detail">${escapeHtml(used.bankName)} · ${escapeHtml(used.discount)}</p>`;
    return;
  }
  if (available) {
    const card = available.eligibleCards[0];
    const cardName = card ? `${card.bankName} ${card.type} Card` : `${available.bankName} ${available.eligibleCardType === 'Any' ? '' : available.eligibleCardType + ' '}Card`;
    offerMatch.className = 'offer-match is-missed';
    offerMatch.innerHTML = `<h4>Potential saving found</h4><p>You could have saved <strong>${money(available.estimatedSavings)} BDT</strong> with ${escapeHtml(cardName.trim())} using <strong>${escapeHtml(available.title)}</strong>.</p><p class="match-detail">Select the card you used above if it was this card, and we’ll record the saving.</p>`;
    return;
  }
  offerMatch.className = 'offer-match is-none';
  offerMatch.innerHTML = '<h4>No active offer match</h4><p>No currently active offer matches this receipt. You can still save the transaction.</p>';
}

document.getElementById('confirm-save-btn').addEventListener('click', async () => {
  const category = document.getElementById('result-category').value;
  const amount = Number(document.getElementById('result-amount').value);
  if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
  try {
    const response = await fetch('/api/save-receipt-transaction', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: document.getElementById('result-merchant').value,
        category, amount, cardId: cardSelect.value || null, offerId: matchedOfferId,
        description: document.getElementById('result-description').value
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not save transaction');
    showToast(data.savingsAmount ? `Transaction saved with ${money(data.savingsAmount)} BDT in savings!` : 'Transaction saved!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (error) {
    showToast(error.message || 'Could not reach server. Is Flask running?', 'error');
  }
});

function money(value) { return Number(value || 0).toFixed(2); }
function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value || '';
  return element.innerHTML;
}
