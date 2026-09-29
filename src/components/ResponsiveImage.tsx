import type { CSSProperties } from "react";
import type { ProductImage } from "@/lib/types";

// next/image gives zero benefit here -- next.config has `images.unoptimized`
// (required for static export), so it never resizes anything and just
// serves the original file at every requested size. The API already
// generates real 400/800/1200px WebP copies (see url_400/url_800/url on
// ProductImage), so a plain <img> with a manual srcset lets the browser
// pick the small one on mobile instead of downloading the full 1200px file.
export default function ResponsiveImage({
  image,
  alt,
  sizes,
  priority = false,
  className,
  style,
}: {
  image: Pick<ProductImage, "url" | "url_400" | "url_800" | "width" | "height">;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const srcSet = [
    image.url_400 ? `${image.url_400} 400w` : null,
    image.url_800 ? `${image.url_800} 800w` : null,
    image.width ? `${image.url} ${image.width}w` : `${image.url} 1200w`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized; see comment above.
    <img
      src={image.url}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={style}
    />
  );
}
