"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = "/dashboard/social-media";

const NAV_GROUPS = [
  {
    label: "Cases",
    links: [
      { label: "Dashboard", href: BASE },
      { label: "Investigating", href: `${BASE}/cases/investigating` },
      { label: "Resolved", href: `${BASE}/cases/resolved` },
      { label: "Posts", href: `${BASE}/posts` },
    ],
  },
  {
    label: "Admin",
    links: [
      { label: "Debug", href: `${BASE}/debug` },
      { label: "Users", href: `${BASE}/admin/users` },
    ],
  },
];

export function HCDNavigation() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === BASE) return pathname === BASE;
    return pathname.startsWith(href);
  }

  return (
    <nav className="hcd-subnav" aria-label="Social Media Monitor navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="hcd-nav-group">
          <span className="hcd-nav-group-label">{group.label}</span>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hcd-nav-link${isActive(link.href) ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
