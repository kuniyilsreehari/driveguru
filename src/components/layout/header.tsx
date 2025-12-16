
'use client';

import Link from 'next/link';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, LogOut, LayoutDashboard, MessageSquare, Home, Award, Briefcase, Moon, Sun, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const dashboardPath = isSuperAdmin ? '/admin' : '/dashboard';

  const isLoading = isUserLoading || isCheckingAdmin;
  
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Icons.logo className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Find Local Talent</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="hidden sm:flex items-center space-x-2">
               <Button asChild variant="ghost">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/vacancies">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Vacancies
                </Link>
              </Button>
               <Button asChild variant="ghost">
                <Link href="/featured-experts">
                  <Award className="mr-2 h-4 w-4" />
                  Featured
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/reviews">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Reviews
                </Link>
              </Button>
              <div className="h-8 w-20" />
            </nav>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
                <Link href="/" className="flex items-center space-x-2 mb-6" onClick={() => setIsMobileMenuOpen(false)}>
                    <Icons.logo className="h-6 w-6" />
                    <span className="font-bold">Find Local Talent</span>
                </Link>
                <div className="flex flex-col space-y-2">
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" /> Home
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/vacancies">
                            <Briefcase className="mr-2 h-4 w-4" /> Vacancies
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/featured-experts">
                            <Award className="mr-2 h-4 w-4" /> Featured
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/reviews">
                            <MessageSquare className="mr-2 h-4 w-4" /> Reviews
                        </Link>
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
        
        <Link href="/" className="mr-auto flex items-center space-x-2">
          <Icons.logo className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">Find Local Talent</span>
        </Link>
        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
          <nav className="hidden sm:flex items-center space-x-1">
            <Button asChild variant="ghost">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
             <Button asChild variant="ghost">
                <Link href="/vacancies">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Vacancies
                </Link>
              </Button>
            <Button asChild variant="ghost">
                <Link href="/featured-experts">
                  <Award className="mr-2 h-4 w-4" />
                  Featured
                </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/reviews">
                <MessageSquare className="mr-2 h-4 w-4" />
                Reviews
              </Link>
            </Button>
          </nav>
            
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.email || ''} />
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">My Account</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(dashboardPath)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <nav className='flex items-center'>
                <Button asChild variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </nav>
            )}
           <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
