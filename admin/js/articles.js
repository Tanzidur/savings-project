const API = '/api/admin';
let articlesCache = [];

const articleModal = document.getElementById('article-modal');
const articleForm = document.getElementById('article-form');
const articleTitleInput = document.getElementById('article-title-input');
const articleCategoryInput = document.getElementById('article-category-input');
const articleReadTimeInput = document.getElementById('article-read-time-input');
const articleSummaryInput = document.getElementById('article-summary-input');
const articleContentInput = document.getElementById('article-content-input');
const articleEditingId = document.getElementById('article-editing-id');
const articleModalTitle = document.getElementById('article-modal-title');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadArticles() {
  fetch(`${API}/articles`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      articlesCache = data;
      renderArticles(data);
    })
    .catch(err => {
      console.error('Failed to load articles:', err);
      document.getElementById('articles-tbody').innerHTML =
        `<tr class="empty-row"><td colspan="5">Could not load articles. Is Flask running?</td></tr>`;
    });
}

function renderArticles(articles) {
  const tbody = document.getElementById('articles-tbody');

  if (!articles.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No articles yet. Click "Add Article" to write one.</td></tr>`;
    return;
  }

  tbody.innerHTML = articles.map(a => `
    <tr>
      <td>${escapeHtml(a.title)}</td>
      <td>${escapeHtml(a.category)}</td>
      <td class="cell-muted">${escapeHtml(truncate(a.summary, 80))}</td>
      <td class="cell-muted">${escapeHtml(a.readTime)}</td>
      <td class="col-actions">
        <button class="btn-sm btn-edit" data-edit="${a.id}">Edit</button>
        <button class="btn-sm btn-delete" data-delete="${a.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function openAddArticle() {
  articleModalTitle.textContent = 'Add Article';
  articleForm.reset();
  articleEditingId.value = '';
  articleModal.classList.remove('hidden');
}

function openEditArticle(id) {
  const article = articlesCache.find(a => a.id === Number(id));
  if (!article) return;

  articleModalTitle.textContent = 'Edit Article';
  articleEditingId.value = article.id;
  articleTitleInput.value = article.title || '';
  articleCategoryInput.value = article.category || '';
  articleReadTimeInput.value = article.readTime || '';
  articleSummaryInput.value = article.summary || '';
  articleContentInput.value = article.content || '';
  articleModal.classList.remove('hidden');
}

function closeArticleModal() {
  articleModal.classList.add('hidden');
}

function deleteArticle(id) {
  if (!confirm('Delete this article?')) return;

  fetch(`${API}/articles/${id}`, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Article deleted', 'success');
        loadArticles();
      } else {
        showToast(data.error || 'Could not delete article', 'error');
      }
    })
    .catch(err => {
      showToast('Could not reach server', 'error');
      console.error(err);
    });
}

document.getElementById('add-article-btn').addEventListener('click', openAddArticle);
document.getElementById('article-cancel-btn').addEventListener('click', closeArticleModal);

document.getElementById('articles-tbody').addEventListener('click', (e) => {
  const editId = e.target.getAttribute('data-edit');
  const deleteId = e.target.getAttribute('data-delete');
  if (editId) openEditArticle(editId);
  if (deleteId) deleteArticle(deleteId);
});

articleForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const editingId = articleEditingId.value;
  const title = articleTitleInput.value.trim();

  if (!title) {
    showToast('Article title is required', 'error');
    return;
  }

  const payload = {
    title,
    category: articleCategoryInput.value.trim(),
    readTime: articleReadTimeInput.value.trim(),
    summary: articleSummaryInput.value.trim(),
    content: articleContentInput.value.trim()
  };

  const isEdit = !!editingId;
  const url = isEdit ? `${API}/articles/${editingId}` : `${API}/articles`;
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
      showToast(isEdit ? 'Article updated' : 'Article added', 'success');
      closeArticleModal();
      loadArticles();
    } else {
      showToast(data.error || 'Could not save article', 'error');
    }
  })
  .catch(err => {
    showToast('Could not reach server', 'error');
    console.error(err);
  });
});

loadArticles();
