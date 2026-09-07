import { notFound } from "next/navigation";
import Link from "next/link";
import { ApiError, getProduct } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getProduct(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <nav className="mb-8 text-sm text-ink/60">
        <Link href="/shop" className="hover:text-gold">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="hover:text-gold"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            {product.category.name}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-2xl font-medium text-ink">
            {formatPrice(product.price)}
          </p>

          {product.description && (
            <p className="mt-6 max-w-xl leading-relaxed text-ink/70">
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <AddToCartForm product={product} />
          </div>

          <dl className="mt-10 space-y-1 text-sm text-ink/50">
            <div className="flex gap-2">
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Availability</dt>
              <dd>
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : "Out of stock"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
