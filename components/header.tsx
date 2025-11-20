"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/LoginDialog";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Menu } from "lucide-react";
import Image from "next/image";

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, authChecked, logout: authLogout } = useAuth();
  // local open state still required for dropdowns/dialog
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  // auth is provided by AuthProvider

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarMenu(false);
    }
    document.addEventListener('click', onDoc);
    // listen for global request to open login dialog (e.g., after auth guard)
    function onOpenLogin() {
      setOpen(true);
    }
    window.addEventListener('open-login', onOpenLogin as EventListener);
    // Defensive cleanup: remove any stray single-letter text nodes (like an unexpected "m")
    // that may have been injected into the header by extensions or accidental markup.
    try {
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const walker = document.createTreeWalker(headerEl, NodeFilter.SHOW_TEXT);
        const toRemove: Text[] = [];
        while (walker.nextNode()) {
          const n = walker.currentNode as Text;
          if (n && n.nodeValue && n.nodeValue.trim() === "m") {
            toRemove.push(n);
          }
        }
        // Debug: log how many stray nodes we found and will remove
        // This helps verify the cleanup ran in the browser console.
        try { console.debug('Header cleanup removed', toRemove.length, 'nodes'); } catch {}
        toRemove.forEach((n) => n.parentElement?.removeChild(n));
      }
    } catch (err) {
      // never throw in UI cleanup
      // eslint-disable-next-line no-console
      console.warn('Header cleanup error', err);
    }

    return () => {
      document.removeEventListener('click', onDoc);
      window.removeEventListener('open-login', onOpenLogin as EventListener);
    };
  }, []);

  // show aptitude result id badge
  const [aptResultId, setAptResultId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rid = localStorage.getItem('aptitudeResultId');
      if (rid) setAptResultId(rid as string);
    }
  }, [])

  async function logout() {
    await authLogout();
  }
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between py-3 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
          <Briefcase className="h-6 w-6" />
          TalentBridge
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium hover:text-primary">Home</Link>
            <Link href="/internships" className="text-sm font-medium hover:text-primary">Internships</Link>
            <Link href="/companies" className="text-sm font-medium hover:text-primary">Companies</Link>
          </nav>

          {/* Desktop avatar + theme + logout */}
          <div className="hidden md:flex items-center gap-3">
            {aptResultId && (
              <div title={`Aptitude result: ${aptResultId}`} className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">
                Test: {aptResultId.slice(0,8)}
              </div>
            )}
            {authChecked ? (user ? (
              <div className="relative" ref={avatarRef}>
                <button onClick={() => setAvatarMenu((s) => !s)} className="p-1">
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    <Image src={user.image || '/icon.png'} alt={user.name || 'avatar'} width={32} height={32} className="object-cover" unoptimized />
                  </div>
                </button>
                {avatarMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded shadow p-2">
                    <div className="text-sm font-medium mb-2">{user.name}</div>
                    <Button onClick={logout} variant="outline" size="sm" className="w-full">Logout</Button>
                  </div>
                )}
              </div>
            ) : (
              // show Login button on desktop once auth check completes
              <>
                <Button variant="outline" onClick={() => setOpen(true)}>Login</Button>
              </>
            )) : (
              // Render a stable placeholder button while auth status is being checked
              <button className="p-1" aria-hidden disabled>
                <div className="h-8 w-8 rounded-full bg-muted/30" />
              </button>
            )}

            {/* Profile is placed before theme toggle on desktop */}
            <ThemeToggle variant="outline" />

            {/* Desktop logout button (visible next to theme) */}
            {user && (
              <Button onClick={logout} variant="outline" className="hidden md:inline-flex">Logout</Button>
            )}
          </div>

          {/* Mobile: avatar/login before menu button */}
          <div className="flex md:hidden items-center gap-2">
            {authChecked ? (user ? (
              <div className="relative" ref={avatarRef}>
                <button onClick={() => setAvatarMenu((s) => !s)} className="p-1">
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    <Image src={user.image || '/icon.png'} alt={user.name || 'avatar'} width={32} height={32} className="object-cover" unoptimized />
                  </div>
                </button>
                {avatarMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded shadow p-2">
                    <div className="text-sm font-medium mb-2">{user.name}</div>
                    <Button onClick={logout} variant="outline" size="sm" className="w-full">Logout</Button>
                  </div>
                )}
              </div>
            ) : (
              // show styled login button on mobile after auth check
              <div>
                <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="px-2">Login</Button>
              </div>
            )) : (
              // Stable placeholder for mobile while auth is checking
              <button className="p-1" aria-hidden disabled>
                <div className="h-8 w-20 rounded bg-muted/30" />
              </button>
            )}

            <button onClick={() => setMenuOpen((s) => !s)} aria-label="menu" className="p-2">
              <Menu />
            </button>
          </div>
          </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="p-4 flex flex-col gap-2">
            <Link href="/">Home</Link>
            <Link href="/internships">Internships</Link>
            <Link href="/companies">Companies</Link>
            <div className="pt-2">
              <ThemeToggle variant="outline" />
            </div>
            {user ? (
              <Button onClick={logout} variant="outline">Logout</Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(true)}>Login</Button>
            )}
          </div>
        </div>
      )}
      {/* Global LoginDialog instance */}
      <LoginDialog isOpen={open} onClose={() => setOpen(false)} />
    </header>
  );
}