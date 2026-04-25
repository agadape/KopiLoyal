"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, QrCode, Gift, User } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/",        label: "Home",    Icon: Home    },
  { href: "/history", label: "History", Icon: Clock   },
  { href: "/payment", label: "Scan",    Icon: QrCode, center: true },
  { href: "/redeem",  label: "Rewards", Icon: Gift    },
  { href: "/profile", label: "Profile", Icon: User    },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center z-50">
      <div className="w-full max-w-md bg-white border-t border-cream">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, label, Icon, center }) => {
            const active = pathname === href;

            if (center) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1 -mt-5"
                >
                  <div className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-float transition-all",
                    active ? "bg-espresso" : "bg-espresso"
                  )}>
                    <Icon size={24} className="text-white" strokeWidth={2} />
                  </div>
                  <span className={clsx(
                    "text-2xs font-medium",
                    active ? "text-espresso" : "text-mocha"
                  )}>
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 py-1 px-3 transition-all"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? "text-espresso" : "text-mocha"}
                />
                <span className={clsx(
                  "text-2xs font-medium",
                  active ? "text-espresso font-semibold" : "text-mocha"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
