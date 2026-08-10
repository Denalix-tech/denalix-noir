/**
 * Server-rendered JSON-LD.
 *
 * Follows the escaping pattern from the local Next.js JSON-LD guide: `<` is
 * replaced with its unicode escape so a stray HTML tag inside any string value
 * (a post title, for instance) cannot break out of the script element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
