const fileInput = document.getElementById('receipt-input');
const uploadBox = document.getElementById('upload-box');
const chooseBtn = document.getElementById('choose-file-btn');
const previewImage = document.getElementById('preview-image');
const uploadPrompt = document.getElementById('upload-prompt');
const analyzeBtn = document.getElementById('analyze-btn');
const resultForm = document.getElementById('result-form');

let selectedFile = null;

chooseBtn.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewImage.classList.remove('hidden');
    uploadPrompt.classList.add('hidden');
    analyzeBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

analyzeBtn.addEventListener('click', () => {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';

  const formData = new FormData();
  formData.append('receipt', selectedFile);

  fetch('/api/ocr-receipt', {
    method: 'POST',
    credentials: 'include',
    body: formData
  })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Receipt';

    if (data.success) {
      document.getElementById('result-category').value = data.data.category;
      document.getElementById('result-amount').value = data.data.amount;
      document.getElementById('result-description').value = data.data.description;
      resultForm.classList.remove('hidden');
      showToast('Receipt read successfully — review before saving', 'success');
    } else {
      showToast(data.error || 'Could not read receipt', 'error');
    }
  })
  .catch(err => {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Receipt';
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});

document.getElementById('confirm-save-btn').addEventListener('click', () => {
  const category = document.getElementById('result-category').value;
  const amount = parseFloat(document.getElementById('result-amount').value);
  const description = document.getElementById('result-description').value;

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  fetch('/api/add-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ category, amount, description })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Transaction added!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    } else {
      showToast(data.error || 'Could not save transaction', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server. Is Flask running?', 'error');
    console.error(err);
  });
});