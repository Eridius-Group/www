import type { FrontmatterResult } from '@lib/types.ts';

/**
 * Capitalizes the first letter of each word, keeping small connector words
 * (articles, prepositions, conjunctions) lowercase unless they are the first
 * or last word in the string.
 *
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str: string): string {
  const smallWords =
    /^(a|an|the|and|but|for|nor|or|so|yet|as|at|by|in|of|off|on|per|to|up|via)$/i;

  return str
    .toLowerCase()
    .replace(/\b[a-z]+(?:'[a-z]+)?\b/g, (word, index) => {
      const isFirstWord = index === 0;
      const isLastWord = index + word.length === str.length;
      const isSmallWord = smallWords.test(word);

      if (isFirstWord || isLastWord || !isSmallWord) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      return word;
    });
}

/**
 * Extracts YAML frontmatter from the top of a markdown string and returns both
 * the parsed key/value pairs and the remaining content body.
 *
 * @param {string} rawMarkdown
 * @returns {FrontmatterResult}
 */
export function extractFrontmatter(rawMarkdown: string): FrontmatterResult {
  const match = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return { frontmatter: {}, content: rawMarkdown };
  }

  const yamlBlock = match[1];
  const content = rawMarkdown.slice(match[0].length).trim();
  const frontmatter: Record<string, string> = {};

  for (const line of yamlBlock.split("\n")) {
    const splitIndex = line.indexOf(":");
    if (splitIndex !== -1) {
      const key = line.slice(0, splitIndex).trim();
      const value = line.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content };
}
