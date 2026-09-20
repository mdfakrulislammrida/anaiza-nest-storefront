const BADGES = [
  {
    title: "Nationwide delivery",
    subtitle: "1–3 days in Dhaka, 3–5 outside",
    icon: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    ),
  },
  {
    title: "Secure checkout",
    subtitle: "bKash, Nagad, Rocket & COD",
    icon: <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />,
  },
  {
    title: "Easy returns",
    subtitle: "7-day return window",
    icon: <path d="M4 4v6h6M4 10a8 8 0 1 1 2.3 5.7" />,
  },
  {
    title: "Real support",
    subtitle: "WhatsApp & phone, 7 days a week",
    icon: <path d="M4 4h16v12H7l-3 3z" />,
  },
];

export default function TrustBadges() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {BADGES.map((badge) => (
          <div key={badge.title} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-6 w-6 shrink-0 text-navy"
            >
              {badge.icon}
            </svg>
            <div>
              <p className="text-sm font-medium text-ink">{badge.title}</p>
              <p className="text-xs text-muted">{badge.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
