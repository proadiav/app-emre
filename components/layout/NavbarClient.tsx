'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface NavbarClientProps {
  userEmail: string;
  role: 'admin' | 'vendeur';
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Clients' },
  { href: '/vouchers', label: 'Bons' },
];

const ADMIN_LINKS = [
  { href: '/admin/settings', label: 'Paramètres' },
  { href: '/admin/stats', label: 'Statistiques' },
  { href: '/admin/audit-logs', label: 'Journal d\'audit' },
  { href: '/admin/staff', label: 'Personnel' },
];

export function NavbarClient({ userEmail, role }: NavbarClientProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <nav className="bg-[#2c2c3a] border-b border-[#3e3e50]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left: Logo + nav links (desktop) */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[15px] font-semibold text-[#d4b97a]">
            Programme Ambassadeur
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[rgba(212,185,122,0.1)] text-[#e8e8ec]'
                    : 'text-[#9d9dab] hover:bg-white/5 hover:text-[#e8e8ec]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Admin dropdown + user + logout (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm font-medium ${
                    pathname.startsWith('/admin')
                      ? 'bg-[rgba(212,185,122,0.1)] text-[#e8e8ec]'
                      : 'text-[#9d9dab] hover:bg-white/5 hover:text-[#e8e8ec]'
                  }`}
                >
                  Admin
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {ADMIN_LINKS.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={isActive(link.href) ? 'bg-accent' : ''}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <span className="text-xs text-[#9d9dab]">{userEmail}</span>
          <LogoutButton />
        </div>

        {/* Mobile: hamburger */}
        <div className="md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#e8e8ec] hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#2c2c3a] border-[#3e3e50] w-72 p-0">
              <SheetTitle className="px-5 pt-5 pb-3 text-[#d4b97a] text-base font-semibold">
                Ambassadeur
              </SheetTitle>
              <div className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className={`px-5 py-3 text-sm transition-colors ${
                      isActive(link.href)
                        ? 'bg-[rgba(212,185,122,0.08)] text-[#e8e8ec]'
                        : 'text-[#9d9dab] hover:bg-white/5 hover:text-[#e8e8ec]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {role === 'admin' && (
                  <>
                    <Separator className="bg-[#3e3e50] my-1" />
                    {ADMIN_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSheetOpen(false)}
                        className={`px-5 py-3 text-sm transition-colors ${
                          isActive(link.href)
                            ? 'bg-[rgba(212,185,122,0.08)] text-[#e8e8ec]'
                            : 'text-[#9d9dab] hover:bg-white/5 hover:text-[#e8e8ec]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </>
                )}
                <Separator className="bg-[#3e3e50] my-1" />
                <div className="px-5 py-3">
                  <p className="text-xs text-[#666]">{userEmail}</p>
                  <LogoutButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
