let verifyPhone = '';
let verifyNid = '';
let accountVerified = false;

function showVerifyStep(step) {
  document.querySelectorAll('[data-step-panel]').forEach(panel => {
    panel.hidden = Number(panel.dataset.stepPanel) !== step;
  });
  document.querySelectorAll('.step-dot').forEach(dot => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle('active', n === step);
    dot.classList.toggle('done', n < step);
  });
}

function maskNid(nid) {
  const digits = String(nid || '');
  if (digits.length <= 4) return digits;
  return '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function fillReview() {
  const phoneText = verifyPhone || '—';
  const nidText = maskNid(verifyNid) || '—';
  document.getElementById('review-phone').textContent = phoneText;
  document.getElementById('review-nid').textContent = nidText;
  document.getElementById('verified-phone').textContent = phoneText;
  document.getElementById('verified-nid').textContent = nidText;
}

function setVerifiedUi(verified) {
  accountVerified = !!verified;
  document.getElementById('verify-complete').hidden = !accountVerified;
  document.getElementById('verify-wizard').hidden = accountVerified;
}

fetch('/api/profile', { credentials: 'include' })
  .then(res => {
    if (res.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    document.getElementById('profile-name').value = data.name;
    document.getElementById('profile-email').value = data.email;
    verifyPhone = data.phone || '';
    verifyNid = data.nid || '';
    document.getElementById('verify-phone').value = verifyPhone;
    document.getElementById('verify-nid').value = verifyNid;
    fillReview();
    setVerifiedUi(!!data.accountVerified);

    if (!data.accountVerified) {
      if (data.phoneVerified && data.nidVerified) {
        showVerifyStep(3);
      } else if (data.phoneVerified) {
        showVerifyStep(2);
      } else {
        showVerifyStep(1);
      }
    }
  });

document.getElementById('info-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;

  fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Profile updated', 'success');
    } else {
      showToast(data.error || 'Could not update profile', 'error');
    }
  });
});

document.getElementById('password-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;

  fetch('/api/profile/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Password updated', 'success');
      document.getElementById('password-form').reset();
    } else {
      showToast(data.error || 'Could not update password', 'error');
    }
  });
});

function postVerify(body) {
  return fetch('/api/profile/verification', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  }).then(res => res.json().then(data => ({ ok: res.ok, data })));
}

document.getElementById('verify-phone-btn').addEventListener('click', () => {
  if (accountVerified) return;
  const phone = document.getElementById('verify-phone').value.trim();
  postVerify({ step: 'phone', phone }).then(({ ok, data }) => {
    if (!ok || !data.success) {
      showToast(data.error || 'Could not save phone number', 'error');
      return;
    }
    verifyPhone = data.phone;
    fillReview();
    showVerifyStep(2);
    showToast('Phone saved', 'success');
  });
});

document.getElementById('verify-nid-btn').addEventListener('click', () => {
  if (accountVerified) return;
  const nid = document.getElementById('verify-nid').value.trim();
  postVerify({ step: 'nid', nid }).then(({ ok, data }) => {
    if (!ok || !data.success) {
      showToast(data.error || 'Could not save NID', 'error');
      return;
    }
    verifyNid = data.nid;
    fillReview();
    showVerifyStep(3);
    showToast('NID saved', 'success');
  });
});

document.getElementById('verify-confirm-btn').addEventListener('click', () => {
  if (accountVerified) return;
  postVerify({ step: 'confirm' }).then(({ ok, data }) => {
    if (!ok || !data.success) {
      showToast(data.error || 'Could not verify account', 'error');
      return;
    }
    if (data.phone) verifyPhone = data.phone;
    if (data.nid) verifyNid = data.nid;
    fillReview();
    setVerifiedUi(true);
    showToast('Account verified', 'success');
  });
});

document.getElementById('verify-back-2').addEventListener('click', () => {
  if (!accountVerified) showVerifyStep(1);
});
document.getElementById('verify-back-3').addEventListener('click', () => {
  if (!accountVerified) showVerifyStep(2);
});
