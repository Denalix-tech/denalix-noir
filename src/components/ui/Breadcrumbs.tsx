import Link from "next/link";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

/**
 * Visible breadcrumb trail. Must be kept in step with the BreadcrumbList
 * JSON-LD on the same page — structured data that does not match what a
 * visitor can see is a rich-results violation.
 *
 * Links are ordinary anchors, so they are keyboard reachable by default. The
 * final crumb is plain text carrying `aria-current="page"`.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-soft">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-x-2">
              {isLast ? (
                <span aria-current="page" className="text-muted">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="transition-colors hover:text-white focus-visible:text-white"
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden="true" className="text-muted-soft/60">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
