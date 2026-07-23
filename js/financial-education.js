const articleList = document.getElementById('article-list');

fetch('http://127.0.0.1:5000/api/articles')
  .then(response => response.json())
  .then(articles => {
    renderArticles(articles);
  })
  .catch(error => {
    articleList.innerHTML = '<p class="loading-msg">Could not load articles. Is Flask running?</p>';
    console.error('Error loading articles:', error);
  });

function renderArticles(articles) {
  articleList.innerHTML = '';

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
      <span class="article-category">${article.category}</span>
      <h3>${article.title}</h3>
      <p class="article-summary">${article.summary}</p>
      <p class="article-meta">${article.readTime} read · Tap to expand</p>
      <p class="article-content">${article.content}</p>
    `;

    card.addEventListener('click', () => {
      const content = card.querySelector('.article-content');
      content.classList.toggle('expanded');
    });

    articleList.appendChild(card);
  });
}