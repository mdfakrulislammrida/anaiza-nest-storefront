"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError, getProductReviews, submitProductReview } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Review, ReviewsPage } from "@/lib/types";
import Stars from "./Stars";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 min-h-12 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-3 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-medium text-stone";

function authToken(): string | null {
  try {
    const raw = window.localStorage.getItem("anaiza-auth");
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
  } catch {
    return null;
  }
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        {review.verified_purchase && (
          <span className="rounded-btn bg-linen px-2 py-1 text-caption font-medium text-navy">Verified purchase</span>
        )}
      </div>
      {review.title && <h3 className="mt-2 font-serif text-body font-semibold text-charcoal">{review.title}</h3>}
      <p className="mt-2 whitespace-pre-line break-words text-body leading-relaxed text-charcoal/80">{review.body}</p>

      {review.photos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.photos.map((photo) => (
            <li key={photo.url}>
              <a href={photo.url} target="_blank" rel="noreferrer noopener">
                {/* eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized. */}
                <img src={photo.thumb} alt="" loading="lazy" decoding="async" className="h-20 w-20 rounded-btn object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-caption text-stone">
        {review.name}
        {review.created_at ? `, ${formatDate(review.created_at)}` : ""}
      </p>

      {review.admin_reply && (
        <div className="mt-3 rounded-btn border-l-2 border-gold bg-linen/60 p-4">
          <p className="text-caption font-medium text-navy">Reply from Anaiza Nest</p>
          <p className="mt-1 whitespace-pre-line break-words text-body text-charcoal/80">{review.admin_reply}</p>
        </div>
      )}
    </li>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const uid = useId();
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Known only on the client; the server render shows the order-number fields, which is the safe default.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage on mount -- see AuthContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignedIn(authToken() !== null);
  }, []);

  const error = (field: string) =>
    errors[field]?.[0] ? <p className="mt-1 text-caption text-burgundy">{errors[field][0]}</p> : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrors({});
    setFormError(null);

    const form = new FormData(event.currentTarget);
    form.set("rating", String(rating || ""));
    // An empty file input still sends one empty part; drop it.
    const photos = form.getAll("photos").filter((file) => file instanceof File && file.size > 0);
    form.delete("photos");
    photos.slice(0, 3).forEach((file) => form.append("photos[]", file));
    if (photos.length > 3) {
      setErrors({ photos: ["You can add up to three photos."] });
      setStatus("idle");
      return;
    }

    try {
      await submitProductReview(slug, form, authToken());
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.errors) {
        // The server's messages are written in our voice, so they are shown as they are.
        setErrors(err.errors);
        setFormError("Please check the highlighted fields and try again.");
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError("That is a lot of tries in a short time. Please wait a little and try again.");
      } else {
        setFormError("Sorry, that did not go through. Please try again in a moment.");
      }
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="mt-6 rounded-btn border border-linen bg-linen p-6 text-body text-charcoal">
        <p>Thank you. Your review is with us and will appear once we have read it.</p>
        <button type="button" onClick={onDone} className="mt-4 min-h-11 text-button text-navy underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-btn border border-linen p-4 sm:p-6" noValidate>
      <fieldset>
        <legend className={labelClass}>Your rating</legend>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              onClick={() => setRating(value)}
              className="flex h-11 w-11 items-center justify-center rounded-btn hover:bg-linen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" strokeWidth={1.2} strokeLinejoin="round">
                <path
                  d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z"
                  className={value <= rating ? "fill-gold stroke-gold" : "fill-none stroke-stone/60"}
                />
              </svg>
            </button>
          ))}
        </div>
        {error("rating")}
      </fieldset>

      <div>
        <label htmlFor={`${uid}-title`} className={labelClass}>
          Title (optional)
        </label>
        <input id={`${uid}-title`} name="title" maxLength={120} className={inputClass} />
        {error("title")}
      </div>

      <div>
        <label htmlFor={`${uid}-body`} className={labelClass}>
          How was it?
        </label>
        <textarea id={`${uid}-body`} name="body" rows={5} maxLength={2000} required className={inputClass} />
        {error("body")}
      </div>

      <div>
        <label htmlFor={`${uid}-name`} className={labelClass}>
          Name to show
        </label>
        <input id={`${uid}-name`} name="name" required maxLength={80} autoComplete="given-name" className={inputClass} />
        {error("name")}
      </div>

      <div>
        <label htmlFor={`${uid}-photos`} className={labelClass}>
          Photos (optional, up to three)
        </label>
        <input
          id={`${uid}-photos`}
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-1 block w-full text-base text-charcoal file:mr-4 file:min-h-11 file:rounded-btn file:border file:border-stone/80 file:bg-ivory file:px-4 file:text-button file:text-charcoal"
        />
        {error("photos")}
        {Object.keys(errors).some((key) => key.startsWith("photos.")) && (
          <p className="mt-1 text-caption text-burgundy">
            {errors[Object.keys(errors).find((key) => key.startsWith("photos.")) as string][0]}
          </p>
        )}
      </div>

      {!signedIn && (
        <div className="space-y-4 rounded-btn bg-linen/60 p-4">
          <p className="text-caption text-charcoal/80">
            Reviews come from people who have ordered this piece. Give the order number and the phone number on that order,
            or{" "}
            <a href="/account" className="underline">
              sign in
            </a>
            .
          </p>
          <div>
            <label htmlFor={`${uid}-order`} className={labelClass}>
              Order number
            </label>
            <input id={`${uid}-order`} name="order_number" inputMode="numeric" autoComplete="off" required className={inputClass} />
            {error("order_number")}
          </div>
          <div>
            <label htmlFor={`${uid}-phone`} className={labelClass}>
              Phone number on the order
            </label>
            <input id={`${uid}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={inputClass} />
          </div>
        </div>
      )}

      {formError && (
        <p role="alert" className="text-body text-burgundy">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 w-full rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {status === "sending" ? "Sending..." : "Send review"}
      </button>
    </form>
  );
}

// The Reviews section. It starts from the first page of approved reviews that was built into the page, so a visitor
// (and a search engine) reads them straight away, then quietly asks for the latest. With no review at all it shows
// no stars and no counts, only an invitation.
export default function ProductReviews({ slug, initial }: { slug: string; initial: ReviewsPage | null }) {
  const [reviews, setReviews] = useState<Review[]>(initial?.data ?? []);
  const [summary, setSummary] = useState(initial?.summary ?? { rating_count: 0, rating_average: null });
  const [lastPage, setLastPage] = useState(initial?.meta.last_page ?? 1);
  const [page, setPage] = useState(initial?.meta.current_page ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProductReviews(slug, 1)
      .then((fresh) => {
        if (cancelled) return;
        setReviews(fresh.data);
        setSummary(fresh.summary);
        setLastPage(fresh.meta.last_page);
        setPage(1);
      })
      .catch(() => {
        // What was built into the page is still correct enough to show.
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await getProductReviews(slug, page + 1);
      setReviews((current) => [...current, ...next.data.filter((review) => !current.some((existing) => existing.id === review.id))]);
      setPage(next.meta.current_page);
      setLastPage(next.meta.last_page);
    } catch {
      // The button stays, so the visitor can try again.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasReviews = summary.rating_count >= 1 && summary.rating_average !== null;

  return (
    <section id="reviews" className="mt-16 max-w-3xl scroll-mt-24">
      <h2 className="mb-4 font-serif text-charcoal text-h2">Reviews</h2>

      {hasReviews && (
        <p className="mb-2 flex flex-wrap items-center gap-3">
          <Stars rating={summary.rating_average as number} />
          <span className="text-body text-charcoal">
            {(summary.rating_average as number).toFixed(1)} out of 5, {summary.rating_count}{" "}
            {summary.rating_count === 1 ? "review" : "reviews"}
          </span>
        </p>
      )}

      {reviews.length > 0 ? (
        <ul className="divide-y divide-linen">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
      ) : (
        <p className="text-body text-stone">No reviews yet. If you have ordered this piece, we would love to hear how it was.</p>
      )}

      {page < lastPage && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 min-h-11 rounded-btn border border-stone/80 px-6 text-button text-charcoal hover:border-navy disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Show more reviews"}
        </button>
      )}

      {formOpen ? (
        <ReviewForm slug={slug} onDone={() => setFormOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mt-6 min-h-12 rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          Write a review
        </button>
      )}
    </section>
  );
}
