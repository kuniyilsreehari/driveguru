'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Rss, Briefcase, Users, Search, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Feed', href: '/feed', icon: Rss },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Groups', href: '/groups', icon: Users },
  { label: 'Jobs', href: '/vacancies', icon: Briefcase },
  { label: 'Guides', href: '/guides', icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] block sm:hidden bg-background/95 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-300 flex-1",
                isActive ? "text-orange-500 scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              {isActive && <div className="h-1 w-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}