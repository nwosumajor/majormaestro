"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/assessment", label: "Staff Classification" },
  { href: "/roadmap", label: "Career Roadmap" },
  { href: "/bulk", label: "Bulk Assessment" },
  { href: "/recovery", label: "Recovery Portal", accent: true },
  { href: "/history", label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors group-hover:bg-indigo-700">
            <BrainCircuit size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-slate-900">MajorGBN</span>
            <span className="text-[10px] font-medium text-slate-400 tracking-wide hidden sm:block">Enterprise Platform</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, accent }) => {
            const isActive = pathname.startsWith(href);
            if (accent) {
              return (
                <Link key={href} href={href} className={`ml-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-emerald-700 text-white" : "border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"}`}>
                  {label}
                </Link>
              );
            }
            return (
              <Link key={href} href={href} className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <button className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label, accent }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? (accent ? "bg-emerald-700 text-white" : "bg-indigo-50 text-indigo-700") : accent ? "border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
