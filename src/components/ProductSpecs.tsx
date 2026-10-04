import type { ProductSpec } from "@/lib/types";

// A real <table> with thead/tbody, rendered into the static HTML. The wrapper
// scrolls sideways on narrow screens; the table has a minimum width so rows
// stay readable instead of squeezing, and the page never overflows.
export default function ProductSpecs({ specifications }: { specifications: ProductSpec[] }) {
  if (specifications.length === 0) return null;

  return (
    <section className="mt-16 max-w-3xl">
      <h2 className="mb-4 font-serif text-xl text-ink sm:text-2xl">Specifications</h2>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
          <thead className="bg-pill text-ink">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Specification
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {specifications.map((spec, index) => (
              <tr key={`${spec.label}-${index}`} className="border-t border-line">
                <th scope="row" className="w-2/5 px-3 py-2 align-top font-medium text-ink">
                  {spec.label}
                </th>
                <td className="px-3 py-2 align-top text-ink/80">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
