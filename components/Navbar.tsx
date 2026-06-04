"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, LogOut, User as UserIcon, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

// Recovery (the revenue product) leads; AI tools follow.
const NAV_LINKS = [
  { href: "/recovery", label: "Recovery Portal", accent: true },
  { href: "/recovery/track", label: "Track a Case" },
  { href: "/classify", label: "HR Staff Classification" },
  { href: "/roadmap", label: "Career Roadmap" },
];

interface ClientUser {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
}

function GoogleLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function UserMenu({ pathname }: { pathname: string }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/client/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.user) setUser(data.user as ClientUser);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [pathname]);

  if (!loaded) {
    return <div className="h-9 w-9 rounded-full bg-slate-100" />;
  }

  if (!user) {
    return (
      <a
        href={`/client/signin?next=${encodeURIComponent(pathname)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <GoogleLogo />
        <span className="hidden sm:inline">Sign in</span>
      </a>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 transition-colors"
        aria-label="Account menu"
      >
        {user.imageUrl ? (
          <Image src={user.imageUrl} alt={user.name ?? user.email} width={24} height={24} className="rounded-full" unoptimized />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <UserIcon size={12} />
          </div>
        )}
        <span className="hidden sm:inline max-w-[120px] truncate text-xs font-semibold text-slate-700">
          {user.name ?? user.email}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-800 truncate">{user.name ?? "Signed in"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
          <Link
            href="/client/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard size={13} /> My dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-slate-100"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide the marketing navbar entirely on admin and client-dashboard routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/client")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-display text-lg font-black text-accent-bright transition-colors group-hover:bg-ink-700">
            ₦
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold tracking-tight text-ink">MajorGBN</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 sm:block">Forensic Recovery</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ href, label, accent }) => {
            const isActive = pathname === href || (href !== "/recovery" && pathname.startsWith(href));
            if (accent) {
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "text-accent" : "text-slate-700 hover:text-accent"}`}
                >
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-slate-100 text-ink" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Persistent primary conversion CTA */}
          <Link
            href="/recovery#intake"
            onClick={() => track("cta_click", { label: "navbar_lodge" })}
            className="hidden items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-bright hover:-translate-y-0.5 sm:inline-flex"
          >
            <Scale size={15} />
            Lodge a Complaint
          </Link>

          <UserMenu pathname={pathname} />

          {/* Mobile menu button */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          {NAV_LINKS.map(({ href, label, accent }) => {
            const isActive = pathname === href || (href !== "/recovery" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-slate-100 text-ink" : accent ? "font-semibold text-accent" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/recovery#intake"
            onClick={() => { setMobileOpen(false); track("cta_click", { label: "navbar_mobile_lodge" }); }}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            <Scale size={15} />
            Lodge a Complaint
          </Link>
        </div>
      )}
    </header>
  );
}
