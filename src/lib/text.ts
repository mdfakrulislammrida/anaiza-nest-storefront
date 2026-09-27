// Article content is raw HTML from Filament's RichEditor -- there's no
// dedicated excerpt field on the backend, so listing cards derive one by
// stripping tags and truncating to a clean word boundary.
export function excerptFromHtml(html: string | null, maxLength = 160): string {
  if (!html) return "";

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
