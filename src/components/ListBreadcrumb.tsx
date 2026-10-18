import Link from "next/link";

// "Home / Name" above a product list. A category page puts its own above the title instead (CategoryDetail), and
// asks the list not to repeat it.
export default function ListBreadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-4 text-caption text-stone sm:px-6">
      <Link href="/" className="hover:text-navy">
        Home
      </Link>
      <span className="mx-1.5">/</span>
      <span className="text-charcoal">{label}</span>
    </nav>
  );
}
