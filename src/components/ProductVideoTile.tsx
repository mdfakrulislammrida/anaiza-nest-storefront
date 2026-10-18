"use client";

import { useState } from "react";
import type { ProductVideo } from "@/lib/types";

// YouTube and Vimeo links become an embed that is muted and plays inline; anything else is a hosted file.
function toEmbedUrl(url: string): string | null {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&mute=1&playsinline=1`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&playsinline=1`;

  return null;
}

export function videoPosterOf(video: ProductVideo): string | null {
  return video.poster || null;
}

// A video is shown only when it has a poster (the picture the tile shows) and something to play.
export function hasPlayableVideo(video: ProductVideo | null | undefined): video is ProductVideo {
  return Boolean(video && video.poster && (video.url || video.file));
}

// The video as one more tile of the gallery: only the poster loads up front, and nothing plays until it is tapped. It
// then plays muted and inline (on a phone it stays in the tile), and nothing here ever autoplays on load.
export default function ProductVideoTile({ video }: { video: ProductVideo }) {
  const [playing, setPlaying] = useState(false);
  const poster = videoPosterOf(video);

  if (!poster) return null;

  if (playing) {
    const embedUrl = video.url ? toEmbedUrl(video.url) : null;

    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title="Product video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full bg-deepink"
        />
      );
    }

    const source = video.file ?? video.url;
    if (source) {
      return <video src={source} poster={poster} controls muted playsInline autoPlay className="absolute inset-0 h-full w-full bg-deepink object-cover" />;
    }
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label="Play product video" className="group absolute inset-0 block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized. */}
      <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-deepink/20 transition-colors group-hover:bg-deepink/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ivory text-navy">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-6 w-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
