// Renders admin-authored raw HTML as-is. Deliberately not sanitized: only
// trusted staff have admin access to author this content, same trust
// boundary as editing any other part of the site through the panel.
export default function CustomHtmlSection({
  title,
  html,
}: {
  title: string | null;
  html: string | null;
}) {
  if (!html) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {title && (
        <div className="mb-8">
          <h2 className="font-serif text-charcoal text-h2">{title}</h2>
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
