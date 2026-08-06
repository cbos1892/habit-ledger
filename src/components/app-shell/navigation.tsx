"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { primaryNavigation, type NavigationIcon } from "../../lib/navigation";

function NavigationGlyph({ name }: { name: NavigationIcon }) {
  const commonProps = {
    "aria-hidden": true,
    className: "nav-icon",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "today") {
    return (
      <svg {...commonProps}>
        <path d="M5 4.75h14a1.75 1.75 0 0 1 1.75 1.75v12A1.75 1.75 0 0 1 19 20.25H5a1.75 1.75 0 0 1-1.75-1.75v-12A1.75 1.75 0 0 1 5 4.75Z" />
        <path d="M7.5 2.75v4M16.5 2.75v4M3.5 9h17" />
        <path d="m8.5 14 2 2 4.5-4.5" />
      </svg>
    );
  }

  if (name === "week") {
    return (
      <svg {...commonProps}>
        <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="2" />
        <path d="M3.5 8.5h17M8.5 8.75v11.5M15.5 8.75v11.5M3.75 14.5h16.5" />
      </svg>
    );
  }

  if (name === "stats") {
    return (
      <svg {...commonProps}>
        <path d="M4 20V10.5M10 20V4M16 20v-7.5M22 20H2" />
        <path d="m4 8 6-4 6 6 5-4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-3.2v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function PrimaryNavigation() {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav aria-label="Primary navigation">
      <ul className="primary-nav-list">
        {primaryNavigation.map((item) => {
          const isActive = activeSegment === item.segment;

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className="primary-nav-link"
                href={item.href}
              >
                <NavigationGlyph name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
