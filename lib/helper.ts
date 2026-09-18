/**
 * Creates a safe, detached HTML element used as a no-op fallback when a
 * requested element does not exist, preventing null-dereference crashes.
 * @returns {HTMLElement}
 */
function createShadowElement(): HTMLElement {
  return document.createElement("div");
}

/**
 * Safely finds an element by its ID. Returns a detached fallback element if not found.
 * @param {string} id
 * @param {Document} [parent=document]
 * @returns {HTMLElement}
 */
function getElementById(id: string, parent: Document = document): HTMLElement {
  return parent.getElementById(id) ?? createShadowElement();
}

/**
 * Safely finds a single element matching a CSS selector. Returns a fallback if not found.
 * @param {string} selector
 * @param {Element|Document} [parent=document]
 * @returns {HTMLElement}
 */
function querySelector(selector: string, parent: Element | Document = document): HTMLElement {
  return parent.querySelector(selector) ?? createShadowElement();
}

/**
 * Safely finds all elements matching a CSS selector. Returns a single-fallback array if none found.
 * @param {string} selector
 * @param {Element|Document} [parent=document]
 * @returns {NodeList|Array<HTMLElement>}
 */
function querySelectorAll(selector: string, parent: Element | Document = document): NodeList | Array<HTMLElement> {
  const list = parent.querySelectorAll(selector);
  return list.length > 0 ? list : [createShadowElement()];
}

/**
 * Safely finds elements by class name. Returns a single-fallback array if none found.
 * @param {string} className
 * @param {Element|Document} [parent=document]
 * @returns {HTMLCollection|Array<HTMLElement>}
 */
function getElementsByClassName(className: string, parent: Element | Document = document): HTMLCollection | Array<HTMLElement> {
  const list = parent.getElementsByClassName(className);
  return list.length > 0 ? list : [createShadowElement()];
}

/**
 * Alias for {@link getElementsByClassName}.
 * @param {string} className
 * @param {Element|Document} [parent=document]
 * @returns {HTMLCollection|Array<HTMLElement>}
 */
function getElementsByClass(className: string, parent: Element | Document = document): HTMLCollection | Array<HTMLElement> {
  return getElementsByClassName(className, parent);
}

/**
 * Safely finds elements by tag name. Returns a single-fallback array if none found.
 * @param {string} tagName
 * @param {Element|Document} [parent=document]
 * @returns {HTMLCollection|Array<HTMLElement>}
 */
function getElementsByTagName(tagName: string, parent: Element | Document = document): HTMLCollection | Array<HTMLElement> {
  const list = parent.getElementsByTagName(tagName);
  return list.length > 0 ? list : [createShadowElement()];
}

/**
 * Safely finds the first element matching a tag name. Returns a fallback if not found.
 * @param {string} tagName
 * @param {Element|Document} [parent=document]
 * @returns {HTMLElement}
 */
function getFirstByTagName(tagName: string, parent: Element | Document = document): HTMLElement {
  const list = parent.getElementsByTagName(tagName);
  return list.length > 0 ? (list[0] as HTMLElement) : createShadowElement();
}

/**
 * Registers a callback to run after page content has been injected into the DOM.
 * Stored on `window` so dynamically loaded module scripts can set it before the
 * loader invokes it.
 * @param {Function|null} handler
 */
function setContentsLoadListener(handler: Function | null): void {
  window.activeContentsLoadHandler = handler ?? undefined;
}

/**
 * Returns the active Trusted Types policy, creating one if necessary.
 * Falls back to `null` in environments where Trusted Types are unavailable.
 * @returns {TrustedTypePolicy|null}
 */
function getTrustedTypesPolicy(): any {
  if (window._eridiusTrustedPolicy) {
    return window._eridiusTrustedPolicy;
  }

  if (window.trustedTypes) {
    if (window.trustedTypes.defaultPolicy) {
      window._eridiusTrustedPolicy = window.trustedTypes.defaultPolicy;
      return window._eridiusTrustedPolicy;
    }

    try {
      window._eridiusTrustedPolicy = window.trustedTypes.createPolicy("default", {
        createScriptURL: (s: string) => s,
        createHTML: (s: string) => s,
        createScript: (s: string) => s,
      });
      return window._eridiusTrustedPolicy;
    } catch {
      try {
        window._eridiusTrustedPolicy = window.trustedTypes.createPolicy("eridiusPolicy", {
          createScriptURL: (s: string) => s,
          createHTML: (s: string) => s,
          createScript: (s: string) => s,
        });
        return window._eridiusTrustedPolicy;
      } catch (err) {
        console.warn("Could not create Trusted Types policy", err);
      }
    }
  }

  return null;
}

/**
 * Wraps a URL string in a `TrustedScriptURL` object when Trusted Types are
 * enforced, satisfying strict CSP requirements for dynamic script sources.
 * @param {string} url
 * @returns {TrustedScriptURL|string}
 */
function createTrustedScriptURL(url: string): any {
  const policy = getTrustedTypesPolicy();
  if (policy && typeof policy.createScriptURL === "function") {
    return policy.createScriptURL(url);
  }
  return url;
}

window.createShadowElement = createShadowElement;
window.getElementById = getElementById;
window.querySelector = querySelector;
window.querySelectorAll = querySelectorAll;
window.getElementsByClassName = getElementsByClassName;
window.getElementsByClass = getElementsByClass;
window.getElementsByTagName = getElementsByTagName;
window.getFirstByTagName = getFirstByTagName;
window.setContentsLoadListener = setContentsLoadListener;
window.getTrustedTypesPolicy = getTrustedTypesPolicy;
window.createTrustedScriptURL = createTrustedScriptURL;
