const articleList = document.getElementById('article-list');
const filterBar = document.getElementById('article-filters');
let articlesData = [];
let currentCategory = 'All';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

fetch('/api/articles')
  .then(response => response.json())
  .then(articles => {
    articlesData = Array.isArray(articles) ? articles : [];
    renderFilters();
    renderArticles();
  })
  .catch(error => {
    articleList.innerHTML = '<p class="loading-msg">Could not load articles. Is Flask running?</p>';
    console.error('Error loading articles:', error);
  });

function renderFilters() {
  const cats = ['All', ...new Set(articlesData.map(a => a.category).filter(Boolean))];
  filterBar.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn' + (cat === currentCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      currentCategory = cat;
      renderFilters();
      renderArticles();
    });
    filterBar.appendChild(btn);
  });
}

function renderArticles() {
  articleList.innerHTML = '';
  const list = articlesData.filter(a => currentCategory === 'All' || a.category === currentCategory);

  if (list.length === 0) {
    articleList.innerHTML = '<p class="loading-msg">No guides in this topic yet.</p>';
    return;
  }

  list.forEach(article => {
    const card = document.createElement('article');
    card.className = 'article-card';
    card.innerHTML = `
      <div class="article-top">
        <span class="article-category">${escapeHtml(article.category)}</span>
        <span class="article-meta">${escapeHtml(article.readTime)} read</span>
      </div>
      <h3>${escapeHtml(article.title)}</h3>
      <p class="article-summary">${escapeHtml(article.summary)}</p>
      <button type="button" class="expand-btn">Read guide</button>
      <div class="article-content">${escapeHtml(article.content)}</div>
    `;

    const content = card.querySelector('.article-content');
    const btn = card.querySelector('.expand-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = content.classList.toggle('expanded');
      btn.textContent = open ? 'Hide guide' : 'Read guide';
    });

    articleList.appendChild(card);
  });
}
