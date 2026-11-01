"use client";

import { useEffect } from "react";

// What a page answers when it is asked for by an address it used to have (the page's slug was changed in the admin). A static export cannot send a
// 301 itself, so the page is a small stand-in: its <link rel="canonical"> already names the new address (a search engine follows that), a visitor is
// sent on at once, and a visitor whose browser does not run scripts has the link.
export default function MovedNotice({ to }: { to: string }) {
  useEffect(() => {
    // A full navigation: the new address may be a page made after this build, which only the server's fallback can answer.
    window.location.replace(to);
  }, [to]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-h1">This page has moved</h1>
      <p className="mt-4 text-body text-stone">You are being taken to its new address.</p>
      <a href={to} className="mt-6 inline-block text-body text-navy underline">
        Go to the new page
      </a>
    </div>
  );
}
