"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Clock, User } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/",        label: "Home",    icon: Home    },
  { href: "/payment", label: "Bayar",   icon: QrCode  },
  { href: "/history", label: "Riwayat", icon: Clock   },
  { href: "/profile", label: "Profil",  icon: User    },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center bg-white border-t border-cream">
      <div className="flex items-center justify-around h-16 w-full max-w-md">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                active ? "text-espresso" : "text-brown/50"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
