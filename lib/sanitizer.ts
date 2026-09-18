import DOMPurify from 'dompurify';

/**
 * Safely assigns sanitized HTML content to an element, using the native
 * Sanitizer API when available and falling back to DOMPurify for older browsers.
 *
 * Also exposed on `window.setContents` so dynamically loaded module scripts
 * can call it without a direct module import.
 */
if ("setHTML" in Element.prototype) {
  const sanitizer = new Sanitizer({
    attributes: ["class", "href", "id", "type", "name", "value", "srcset", "src", "sizes"],
    dataAttributes: true,
  });

  window.setContents = (element, contents) =>
    (element as any).setHTML(contents, { sanitizer });
} else {
  window.setContents = (element, contents) => {
    const sanitizedHTML = DOMPurify.sanitize(contents);
    const doc = new DOMParser().parseFromString(sanitizedHTML, "text/html");
    element.replaceWith(doc.body.firstChild || "");
  };
}

/** Typed module-level reference to `window.setContents`. */
export const setContents: (element: HTMLElement, contents: string) => void = window.setContents;
