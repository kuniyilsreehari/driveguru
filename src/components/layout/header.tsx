'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, LogOut, LayoutDashboard, Home, Award, Briefcase, Moon, Sun, Menu, Rss, Users, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const { setTheme, theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user && firestore) {
      setIsCheckingAdmin(true);
      const superAdminDocRef = doc(firestore, 'roles_super_admin', user.uid);
      const unsub = onSnapshot(superAdminDocRef, (doc) => {
        setIsSuperAdmin(doc.exists());
        setIsCheckingAdmin(false);
      });
      return () => unsub();
    } else if (!isUserLoading) {
      setIsSuperAdmin(false);
      setIsCheckingAdmin(false);
    }
  }, [user, isUserLoading, firestore]);

  const handleSignOut = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Feed', href: '/feed', icon: Rss },
    { label: 'Groups', href: '/groups', icon: Users },
    { label: 'Vacancies', href: '/vacancies', icon: Briefcase },
    { label: 'Featured', href: '/featured-experts', icon: Award },
    { label: 'Guides', href: '/guides', icon: BookOpen },
  ];

  const dashboardPath = isSuperAdmin ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden mr-2">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <Icons.logo className="h-6 w-6" /> DriveGuru
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-2">
                    {navItems.map((item) => (
                        <Button 
                            key={item.href} 
                            asChild 
                            variant={pathname === item.href ? "secondary" : "ghost"} 
                            className="justify-start" 
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Link href={item.href}>
                                <item.icon className="mr-2 h-4 w-4" /> {item.label}
                            </Link>
                        </Button>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
        
        <Link href="/" className="mr-auto flex items-center space-x-2">
          <Icons.logo className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">DriveGuru</span>
        </Link>

        <div className="flex items-center justify-end space-x-4">
          <nav className="hidden sm:flex items-center space-x-1">
            {navItems.map((item) => (
                <Button 
                    key={item.href} 
                    asChild 
                    variant={pathname === item.href ? "secondary" : "ghost"} 
                    size="sm"
                    className={cn(pathname === item.href && "text-primary font-bold")}
                >
                    <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" /> {item.label}
                    </Link>
                </Button>
            ))}
          </nav>
            
            {!isUserLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} />
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Account</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(dashboardPath)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !isUserLoading && (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
                <Button asChild size="sm"><Link href="/signup/role">Join</Link></Button>
              </div>
            )}

           <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}