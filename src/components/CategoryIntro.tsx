"use client";

import { useId, useState } from "react";

// A category's summary under its title. A long one is clamped to three lines on a phone (so the products are not pushed
// a screen down) with a real Read more button; the whole text is in the page HTML either way, the clamp is CSS only,
// and from 640 px, or without JavaScript, it is shown in full. A short one is just a paragraph.
const CLAMP_FROM_CHARACTERS = 140;

export default function CategoryIntro({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  if (text.length <= CLAMP_FROM_CHARACTERS) return <p className="an-intro">{text}</p>;

  return (
    <>
      <p id={id} className="an-intro an-intro-clamp" data-expanded={expanded ? "true" : "false"}>
        {text}
      </p>
      <button
        type="button"
        className="an-readmore an-readmore-intro"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Read less" : "Read more"}
      </button>
    </>
  );
}
