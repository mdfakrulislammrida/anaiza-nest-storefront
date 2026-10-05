"use client";

import { useState } from "react";
import type { ProductVideo } from "@/lib/types";

function toEmbedUrl(url: string): string | null {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1`;
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  }

  return null;
}

// Click-to-play facade: only the poster image loads up front. No video
// bytes (hosted file or the YouTube/Vimeo iframe) are requested until the
// visitor taps play, and nothing here ever autoplays with sound on load.
export default function VideoFacade({ video }: { video: ProductVideo }) {
  const [playing, setPlaying] = useState(false);

  if (!video.poster || (!video.url && !video.file)) {
    return null;
  }

  if (playing) {
    const embedUrl = video.url ? toEmbedUrl(video.url) : null;

    if (embedUrl) {
      return (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-deepink">
          <iframe
            src={embedUrl}
            title="Product video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }

    if (video.file) {
      return (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-deepink">
          <video
            src={video.file}
            poster={video.poster}
            controls
            autoPlay
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }

    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Play product video"
      className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-linen"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized. */}
      <img
        src={video.poster}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-deepink/20 transition-colors group-hover:bg-deepink/30">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ivory/90 transition-transform group-hover:scale-105">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6 text-navy">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
