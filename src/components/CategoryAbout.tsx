"use client";

import { useId, useState } from "react";
import { proseHtml } from "@/lib/prose";

// A category's long description: "About {name}", set as the kit's prose. The full text is always in the HTML
// (server-rendered, so it is in view-source and readable without JavaScript); on a phone it is clipped by
// height in CSS and this button only flips data-expanded. From 640px it is never clipped.
export default function CategoryAbout({ name, html }: { name: string; html: string }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();

  return (
    <section className="an-about" aria-labelledby={`${bodyId}-title`}>
      <span className="an-pour" aria-hidden="true" />
      <h2 id={`${bodyId}-title`} className="an-about-title">
        {`About ${name}`}
      </h2>
      <div id={bodyId} className="an-clip" data-expanded={expanded ? "true" : "false"}>
        <div className="an-prose" dangerouslySetInnerHTML={{ __html: proseHtml(html) }} />
      </div>
      <button
        type="button"
        className="an-readmore"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Read less" : "Read more"}
      </button>
    </section>
  );
}
