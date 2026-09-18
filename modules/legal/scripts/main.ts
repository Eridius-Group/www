import { getMarkdownList } from '@lib/loader.ts';

export async function init() {
  const introContent = document.getElementById("introContent");
  const itemSection = document.getElementById("itemSection");
  const routeList = document.getElementById("routeList");

  if (!introContent || !itemSection || !routeList) return;

  if (introContent.innerHTML.trim().length > 0) {
    routeList.classList.add("hidden");
    return;
  }

  itemSection.classList.add("hidden");
  routeList.classList.remove("hidden");

  const list = await getMarkdownList("legal");
  while (routeList.firstChild) routeList.removeChild(routeList.firstChild);
  if (list.length === 0) {
    const article = document.createElement("article");
    const p = document.createElement("p");
    p.textContent = "No items found.";
    article.appendChild(p);
    routeList.appendChild(article);
    return;
  }

  for (const item of list) {
    const article = document.createElement("article");
    const h3 = document.createElement("h3");
    const a = document.createElement("a");
    a.href = `/legal/${item.slug}`;
    a.setAttribute("data-navigo", "");
    a.textContent = item.title;
    h3.appendChild(a);
    const p = document.createElement("p");
    p.textContent = item.excerpt;
    article.appendChild(h3);
    article.appendChild(p);
    routeList.appendChild(article);
  }
}
