/**
 * Parameters passed to page rendering functions.
 * All fields are optional since different routes populate different subsets.
 */
export interface PageParams {
  /** The shell layout to use (e.g. "Website" or "App"). Defaults to "website". */
  Shell?: string;
  /** The page heading shown in the site header. */
  Title?: string;
  /** The subtitle / description shown in the site header. */
  Description?: string;
  /** A small hint or contextual note shown in the site header. */
  Tip?: string;
  /** The main HTML content of the page (e.g. rendered markdown). */
  Content?: string;
  /** An AI-usage disclaimer string shown below article content. */
  Disclaimer?: string;
  /** The display date the document was written / published. */
  WrittenDate?: string;
  /** Raw AI-written percentage string from frontmatter (e.g. "20"). */
  aiPercent?: string;
  /** Raw human-written percentage string from frontmatter (e.g. "80"). */
  humanPercent?: string;
  /** URL to a Grammarly report for this article. */
  grammarlyReport?: string;
  /** URL to a separate writing program report for this article. */
  writerReport?: string;
}

/** Parsed frontmatter + remaining body of a markdown file. */
export interface FrontmatterResult {
  frontmatter: Record<string, string>;
  content: string;
}
