"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IcHome, IcMarkets, IcWaves, IcStats, IcPrivacy, IcIntegrate } from "./icons";
import { WalletRailButton } from "./WalletButton";

const ITEMS = [
  { href: "/markets", label: "Markets", Icon: IcMarkets },
  { href: "/waves", label: "Waves", Icon: IcWaves },
  { href: "/stats", label: "Stats", Icon: IcStats },
  { href: "/privacy", label: "Privacy", Icon: IcPrivacy },
  { href: "/integrate", label: "Integrate", Icon: IcIntegrate },
];

export default function Rail() {
  const pathname = usePathname();
  return (
    <nav className="rail-nav" aria-label="App">
      <Link href="/" className="rail-mark" aria-label="Back to Eclipse landing">
        <IcHome className="rail-mark-ic" />
      </Link>
      <ul className="rail-list">
        {ITEMS.map(({ href, label, Icon }) => {
          const on = pathname === href || pathname.startsWith(href + "/") || (href === "/markets" && pathname.startsWith("/market/"));
          return (
            <li key={href}>
              <Link href={href} className={`rail-item${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
                <Icon className="rail-ic" />
                <span className="rail-tip">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="rail-bottom">
        <WalletRailButton />
      </div>
    </nav>
  );
}
