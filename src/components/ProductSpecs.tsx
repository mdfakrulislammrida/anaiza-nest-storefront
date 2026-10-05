import type { ProductSpec } from "@/lib/types";

// A real <table> with thead/tbody, rendered into the static HTML. The wrapper
// scrolls sideways on narrow screens; the table has a minimum width so rows
// stay readable instead of squeezing, and the page never overflows.
export default function ProductSpecs({ specifications }: { specifications: ProductSpec[] }) {
  if (specifications.length === 0) return null;

  return (
    <section className="mt-16 max-w-3xl">
      <h2 className="mb-4 font-serif text-charcoal text-h2">Specifications</h2>
      <div className="overflow-x-auto rounded-lg border border-linen">
        <table className="w-full min-w-[20rem] border-collapse text-left text-body">
          <thead className="bg-linen text-charcoal">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">
                Specification
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {specifications.map((spec, index) => (
              <tr key={`${spec.label}-${index}`} className="border-t border-linen">
                <th scope="row" className="w-2/5 px-4 py-2 align-top font-medium text-charcoal">
                  {spec.label}
                </th>
                <td className="px-4 py-2 align-top text-charcoal/80">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
