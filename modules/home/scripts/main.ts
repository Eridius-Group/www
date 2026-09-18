import { getMarkdownList } from '@lib/loader.ts';

export async function init() {
  const blogListEl = document.getElementById("homeBlogList");
  if (!blogListEl) return;

  const list = await getMarkdownList("blog");
  while (blogListEl.firstChild) blogListEl.removeChild(blogListEl.firstChild);
  if (list.length === 0) {
    const article = document.createElement("article");
    const p = document.createElement("p");
    p.textContent = "No blog posts found.";
    article.appendChild(p);
    blogListEl.appendChild(article);
    return;
  }

  for (const item of list) {
    const article = document.createElement("article");
    const h3 = document.createElement("h3");
    const a = document.createElement("a");
    a.href = `/blog/${item.slug}`;
    a.setAttribute("data-navigo", "");
    a.textContent = item.title;
    h3.appendChild(a);
    const p = document.createElement("p");
    p.textContent = item.excerpt;
    article.appendChild(h3);
    article.appendChild(p);
    blogListEl.appendChild(article);
  }
}
