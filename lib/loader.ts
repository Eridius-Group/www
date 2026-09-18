import { marked } from 'marked';
import { setContents } from '@lib/sanitizer.ts';
import { toTitleCase, extractFrontmatter } from '@lib/content.ts';
import type { PageParams } from '@lib/types.ts';

const moduleHtmls   = import.meta.glob('/modules/*/index.html',         { query: '?raw', import: 'default' });
const moduleStyles  = import.meta.glob('/modules/*/styles/*.css',        { query: '?raw', import: 'default' });
const moduleScripts = import.meta.glob('/modules/*/scripts/*.ts');

const appHtmls      = import.meta.glob('/modules/app/*/index.html',      { query: '?raw', import: 'default' });
const appMetas      = import.meta.glob('/modules/app/*/meta.json',       { query: '?raw', import: 'default' });
const appStyles     = import.meta.glob('/modules/app/*/styles/*.css',    { query: '?raw', import: 'default' });
const appScripts    = import.meta.glob('/modules/app/*/scripts/*.ts');

const templateHtmls   = import.meta.glob('/templates/*/index.html',      { query: '?raw', import: 'default' });
const templateStyles  = import.meta.glob('/templates/*/styles/*.css',    { query: '?raw', import: 'default' });
const templateScripts = import.meta.glob('/templates/*/scripts/*.ts');
const templateMetas   = import.meta.glob('/templates/*/meta.json',       { query: '?raw', import: 'default' });
const markdownFiles = import.meta.glob('/modules/**/data/**/*.md',       { query: '?raw', import: 'default' });

const injectedStylesheets: CSSStyleSheet[] = [];

/**
 * Scopes `rawCSS` to `pageSelector` and injects it via Constructable Stylesheets
 * to avoid CSP errors. Call {@link clearInjectedStyles} before loading a new page.
 *
 * @param {string} rawCSS - Unscoped CSS source.
 * @param {string} pageSelector - CSS selector to scope rules under, e.g. `#page-quiz`.
 */
export function scopeAndInjectCSS(rawCSS: string, pageSelector: string): void {
  const scopedCSS = scopeCSS(rawCSS, pageSelector);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(scopedCSS);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  injectedStylesheets.push(sheet);
}

function clearInjectedStyles(): void {
  const sheetsToRemove = new Set(injectedStylesheets);
  document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => !sheetsToRemove.has(s));
  injectedStylesheets.length = 0;
}

/**
 * Recursively scopes CSS rules to `pageSelector`.
 *
 * - `@media`, `@supports`, `@layer`, `@container` — recursed into.
 * - `@keyframes`, `@font-face`, `@charset`, `@import`, `@namespace` — passed through unchanged.
 * - All other rules — each selector prefixed with `pageSelector`.
 *
 * @param {string} css
 * @param {string} pageSelector
 * @returns {string}
 */
function scopeCSS(css: string, pageSelector: string): string {
  const WRAPPING_AT_RULES   = /^@(media|supports|layer|container)/i;
  const PASSTHROUGH_AT_RULES = /^@(keyframes|font-face|charset|import|namespace)/i;

  return splitCSSIntoSegments(css)
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return "";

      if (trimmed.startsWith("@")) {
        if (PASSTHROUGH_AT_RULES.test(trimmed)) return trimmed;
        if (WRAPPING_AT_RULES.test(trimmed)) {
          const firstBrace = trimmed.indexOf("{");
          const lastBrace  = trimmed.lastIndexOf("}");
          const atHeader   = trimmed.slice(0, firstBrace + 1);
          const inner      = trimmed.slice(firstBrace + 1, lastBrace);
          return `${atHeader}\n${scopeCSS(inner, pageSelector)}\n}`;
        }
      }

      const firstBrace = trimmed.indexOf("{");
      if (firstBrace === -1) return trimmed;

      const selectors = trimmed.slice(0, firstBrace).trim();
      const body      = trimmed.slice(firstBrace);
      const scoped    = selectors.split(",").map((s) => `${pageSelector} ${s.trim()}`).join(",\n");

      return `${scoped}${body}`;
    })
    .join("\n\n");
}

/**
 * Splits a CSS string into top-level rule segments, respecting brace nesting.
 *
 * @param {string} css
 * @returns {string[]}
 */
function splitCSSIntoSegments(css: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        const seg = css.slice(start, i + 1).trim();
        if (seg) segments.push(seg);
        start = i + 1;
      }
    }
  }

  const trailing = css.slice(start).trim();
  if (trailing) segments.push(trailing);

  return segments;
}

/** Guards against content that attempts to inject the site's own routing script. */
const SCRIPT_INJECTION_GUARD = /<script[^>]+\/lib\//i;

let router: { updatePageLinks: () => void };

/**
 * Provides the loader with a reference to the Navigo router instance so it can
 * call `updatePageLinks()` after each navigation.
 *
 * @param {{ updatePageLinks: () => void }} r
 */
export function setRouter(r: { updatePageLinks: () => void }): void {
  router = r;
}

const notFoundParams: PageParams = {
  Title:       "Bubbas couldn't find that.",
  Shell:       "Website",
  Description: "Now Bubbas is sad.",
  Tip:         'Maybe what you\'re looking for can be found in <a href="/" data-navigo>Home</a>',
};

/** Renders the 404 page. */
export function loadNotFound(): void {
  loadModule({ moduleName: "404", title: "Not Found", params: notFoundParams });
}

interface ModuleOptions {
  /** Module folder name under `/modules/` (e.g. `"home"`, `"blog"`, `"quiz"`). */
  moduleName: string;
  /** Browser tab title, appended with `" | Eridius Group"`. */
  title: string;
  /** Values injected into shell placeholder elements (`introTitle`, `introDescription`, etc.). */
  params: PageParams;
  /**
   * For app sub-modules: the path segment under `/modules/app/`
   * (e.g. `"login"` → `/modules/app/login/`).
   */
  appSubModule?: string;
}

/**
 * Unified page loader. Handles all page types (website modules and app sub-modules).
 *
 * Load sequence:
 * 1. Render the shell template into `<body>`.
 * 2. Inject `params` into the shell's placeholder elements.
 * 3. Load and render the module's `index.html` into `<main>`.
 * 4. Clear prior scoped styles; load, scope, and inject this module's CSS.
 * 5. Load and run module scripts in alphabetical order.
 * 6. Set the document title and refresh Navigo link bindings.
 *
 * @param {ModuleOptions} options
 */
export async function loadModule({ moduleName, title, params, appSubModule }: ModuleOptions): Promise<void> {
  const isApp  = !!appSubModule;
  const shell  = (params.Shell ?? "website").toLowerCase();
  const shellUrl = `/templates/${shell}/index.html`;

  const shellData = templateHtmls[shellUrl]
    ? (await templateHtmls[shellUrl]()) as string
    : "";
  setContents(document.body, shellData);

  const htmlUrl  = isApp ? `/modules/app/${appSubModule}/index.html` : `/modules/${moduleName}/index.html`;
  const htmlGlob = isApp ? appHtmls : moduleHtmls;
  const htmlData = htmlGlob[htmlUrl] ? (await htmlGlob[htmlUrl]()) as string : "";

  if (SCRIPT_INJECTION_GUARD.test(htmlData)) {
    return loadNotFound();
  }

  const mainEl = getFirstByTagName("main") as HTMLElement;
  window.setContentsLoadListener(null);

  const pageId = `page-${isApp ? `app-${appSubModule}` : moduleName}`;
  mainEl.id = pageId;
  setContents(mainEl, htmlData);

  let finalParams = params;
  const templateMetaUrl = `/templates/${shell}/meta.json`;
  if (templateMetas && templateMetas[templateMetaUrl]) {
    const meta = JSON.parse((await templateMetas[templateMetaUrl]()) as string);
    finalParams = { ...meta, ...params };
  }
  loadParams(finalParams);

  clearInjectedStyles();

  const templateStylePrefix = `/templates/${shell}/styles/`;
  for (const styleUrl of Object.keys(templateStyles).filter((k) => k.startsWith(templateStylePrefix))) {
    const rawCSS = (await templateStyles[styleUrl]()) as string;
    scopeAndInjectCSS(rawCSS, "");
  }

  const templateScriptPrefix = `/templates/${shell}/scripts/`;
  for (const scriptUrl of Object.keys(templateScripts).filter((k) => k.startsWith(templateScriptPrefix)).sort()) {
    const mod = await templateScripts[scriptUrl]() as { init?: () => Promise<void> };
    if (typeof mod.init === "function") {
      await mod.init();
    }
  }

  const styleGlob   = isApp ? appStyles : moduleStyles;
  const stylePrefix = isApp ? `/modules/app/${appSubModule}/styles/` : `/modules/${moduleName}/styles/`;

  for (const styleUrl of Object.keys(styleGlob).filter((k) => k.startsWith(stylePrefix))) {
    const rawCSS = (await styleGlob[styleUrl]()) as string;
    scopeAndInjectCSS(rawCSS, `#${pageId}`);
  }

  const scriptGlob   = isApp ? appScripts : moduleScripts;
  const scriptPrefix = isApp ? `/modules/app/${appSubModule}/scripts/` : `/modules/${moduleName}/scripts/`;

  for (const scriptUrl of Object.keys(scriptGlob).filter((k) => k.startsWith(scriptPrefix)).sort()) {
    const mod = await scriptGlob[scriptUrl]() as { init?: () => Promise<void> };
    if (typeof mod.init === "function") {
      await mod.init();
    }
  }

  if (typeof window.activeContentsLoadHandler === "function") {
    await window.activeContentsLoadHandler();
  }

  if (isApp) {
    const metaUrl = `/modules/app/${appSubModule}/meta.json`;
    if (appMetas[metaUrl]) {
      const meta = JSON.parse((await appMetas[metaUrl]()) as string);
      getElementById("appName").innerText = meta.title;
      document.title = meta.title;
      return;
    }
  }

  document.title = `${title} | Eridius Group`;
  router.updatePageLinks();
}

/**
 * Injects `params` values into shell placeholder elements.
 * An element with `id="introTitle"` receives `params.Title`, and so on.
 *
 * @param {PageParams} params
 */
function loadParams(params: PageParams): void {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    setContents(getElementById("intro" + key), value);
  }
}

/**
 * Returns a list of all markdown files in a given category with their slug, title, and description.
 */
export async function getMarkdownList(category: string): Promise<Array<{ slug: string, title: string, excerpt: string }>> {
  const prefix = `/modules/${category}/data/`;
  const list = [];
  for (const url of Object.keys(markdownFiles)) {
    if (url.startsWith(prefix)) {
      const data = (await markdownFiles[url]()) as string;
      if (SCRIPT_INJECTION_GUARD.test(data)) continue;
      const { frontmatter } = extractFrontmatter(data);
      const slug = url.slice(prefix.length, -3);
      list.push({
        slug,
        title: toTitleCase(frontmatter.title || "Untitled"),
        excerpt: frontmatter.description || ""
      });
    }
  }
  return list;
}
/**
 * Loads a markdown file from a module's `data/` directory, parses frontmatter,
 * and returns a `PageParams` object ready for rendering.
 * Calls {@link loadNotFound} and returns `null` if the file is missing or fails
 * the injection guard.
 *
 * @param {string} slug - Filename without the `.md` extension.
 * @param {string} category - Module folder name (e.g. `"blog"`, `"legal"`).
 * @param {string} [subcategory] - Optional sub-folder within `data/`.
 * @returns {Promise<PageParams|null>}
 */
async function fetchMarkdown(
  slug: string,
  category: string,
  subcategory?: string
): Promise<PageParams | null> {
  const subPath = subcategory ? `${subcategory}/` : "";
  const mdUrl   = `/modules/${category}/data/${subPath}${slug}.md`;

  if (!markdownFiles[mdUrl]) {
    loadNotFound();
    return null;
  }

  const data = (await markdownFiles[mdUrl]()) as string;

  if (SCRIPT_INJECTION_GUARD.test(data)) {
    loadNotFound();
    return null;
  }

  const { frontmatter, content } = extractFrontmatter(data);
  const writtenDate = frontmatter.created || "an unknown date";

  return {
    aiPercent:       frontmatter.aiPercent,
    humanPercent:    frontmatter.humanPercent,
    grammarlyReport: frontmatter.grammarlyReport,
    writerReport:    frontmatter.writerReport,
    Title:           toTitleCase(frontmatter.title || "Untitled"),
    Shell:           "Website",
    Description:     frontmatter.description || "",
    WrittenDate:     writtenDate,
    Tip:             `Written by ${toTitleCase(frontmatter.author || "Unknown")} on ${writtenDate}.`,
    Content:         content,
  };
}

/**
 * Builds the AI-usage disclaimer string for a blog post based on its frontmatter.
 *
 * @param {PageParams} params
 * @returns {string}
 */
function buildDisclaimer(params: PageParams): string {
  let disclaimer   = "";
  let aiPercent    = Number(params.aiPercent)    || 0;
  let humanPercent = Number(params.humanPercent) || 0;

  if (!aiPercent && !humanPercent) {
    disclaimer += "The author of this article did not provide an adequate AI disclaimer. This article is still under review and will be removed if it does not meet our AI Guidelines. ";
  } else {
    if (!aiPercent    && humanPercent) aiPercent    = 100 - humanPercent;
    if (aiPercent     && !humanPercent) humanPercent = 100 - aiPercent;
  }

  if (humanPercent > 0 && humanPercent < 100) {
    disclaimer += `We use AI to proofread and tone our articles. This article was ${humanPercent}% written by a human, with ${aiPercent}% being rephrased or expanded upon by Grammarly's AI. `;
  }

  if (params.grammarlyReport) {
    disclaimer += `We have a Grammarly report available at <a href="${params.grammarlyReport}">Grammarly</a> to show the percentages corrected by Grammarly. `;
  }

  if (params.writerReport) {
    disclaimer += `Note that some percentage of "AI Generated Content" is from a copy-paste from a separate writing program, whose report is available <a href="${params.writerReport}">here</a>. This report should also show our writing process along the way, to prove we wrote this article with human intelligence.`;
  }

  return disclaimer;
}

/**
 * Renders a blog post by its slug.
 * @param {string} slug
 */
export async function loadBlog(slug: string): Promise<void> {
  const params = await fetchMarkdown(slug, "blog");
  if (!params) return;

  params.Content    = marked.parse(params.Content ?? "") as string;
  params.Disclaimer = buildDisclaimer(params);

  loadModule({ moduleName: "blog", title: params.Title ?? "Blog", params });
}

/**
 * Renders a legal document by its slug and optional subcategory.
 * @param {string} slug
 * @param {string} [subcategory]
 */
export async function loadLegal(slug: string, subcategory?: string): Promise<void> {
  const params = await fetchMarkdown(slug, "legal", subcategory);
  if (!params) return;

  params.Content     = marked.parse(params.Content ?? "") as string;
  params.Shell       = "Website";
  params.Tip         = "Effective as of " + params.WrittenDate;
  params.Description = "";

  loadModule({ moduleName: "legal", title: params.Title ?? "Legal", params });
}

/**
 * Renders a quiz page driven by the markdown content of the matching blog post.
 * @param {string} slug
 */
export async function loadQuiz(slug: string): Promise<void> {
  const params = await fetchMarkdown(slug, "blog");
  if (!params) return;

  params.Title       = "Quiz: " + params.Title;
  params.Shell       = "Website";
  params.Description = "Test your knowledge! This quiz is for fun; not academics!";
  params.Tip         = "Quizzes are randomly generated; we try to make the questions make sense, but they don't always.";

  loadModule({ moduleName: "quiz", title: params.Title, params });
}

/**
 * Renders an app sub-module page.
 * @param {string} appSubModule - Path segment under `/modules/app/` (e.g. `"login"`).
 */
export async function loadApp(appSubModule: string): Promise<void> {
  await loadModule({ moduleName: "app", title: "App", params: { Shell: "App" }, appSubModule });
}
