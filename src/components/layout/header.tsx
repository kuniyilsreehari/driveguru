

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, limit, writeBatch } from 'firebase/firestore';
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
import { User as UserIcon, LogOut, LayoutDashboard, MessageSquare, Home, Award, Briefcase, Moon, Sun, Menu, Download, Info, Rss, Users, BookOpen, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { installPromptAtom } from '@/lib/store';
import { useAtom } from 'jotai';
import { InstallPwaDialog } from '@/components/install-pwa-dialog';
import { AnnouncementBanner } from './announcement-banner';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

type Notification = {
    id: string;
    type: 'comment_reply' | 'post_like' | 'new_follower';
    message: string;
    link: string;
    read: boolean;
    actorId: string;
    actorName: string;
    actorPhotoUrl: string;
    createdAt: any;
};

function Notifications() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, [user, firestore]);

    const { data: notifications } = useCollection<Notification>(notificationsQuery);

    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open && notifications && unreadCount > 0 && firestore && user) {
            // Mark notifications as read
            const batch = writeBatch(firestore);
            notifications.forEach(notification => {
                if (!notification.read) {
                    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
                    batch.update(notifRef, { read: true });
                }
            });
            await batch.commit();
        }
    };
    
    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return name.substring(0, 2);
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications && notifications.length > 0 ? (
                        notifications.map(notification => (
                            <DropdownMenuItem key={notification.id} asChild>
                                <Link href={notification.link} className={cn("flex items-start gap-3 p-2", !notification.read && "bg-accent/50")}>
                                     <Avatar className="h-8 w-8 mt-1">
                                        <AvatarImage src={notification.actorPhotoUrl} />
                                        <AvatarFallback>{getInitials(notification.actorName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm" dangerouslySetInnerHTML={{ __html: notification.message }} />
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNowStrict(notification.createdAt.toDate())} ago
                                        </p>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            You have no new notifications.
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


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
  const [installPrompt, setInstallPrompt] = useAtom(installPromptAtom);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Client-side only check for online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Automatically show the dialog if the event fires
      setShowInstallDialog(true); 
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setInstallPrompt]);


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
            <span className="hidden font-bold sm:inline-block">DriveGuru</span>
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
                <Link href="/feed">
                  <Rss className="mr-2 h-4 w-4" />
                  Feed
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/groups">
                    <Users className="mr-2 h-4 w-4" />
                    Groups
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
                <Link href="/guides">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Guides
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
    <>
    <AnnouncementBanner />
     {!isOnline && (
        <div className="bg-destructive text-destructive-foreground p-2 text-center text-sm flex items-center justify-center gap-2">
            <Icons.wifiOff className="h-4 w-4" />
            You are currently offline. Some features may be unavailable.
        </div>
    )}
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
                <SheetHeader className="sr-only">
                    <SheetTitle>Mobile Menu</SheetTitle>
                </SheetHeader>
                <Link href="/" className="flex items-center space-x-2 mb-6" onClick={() => setIsMobileMenuOpen(false)}>
                    <Icons.logo className="h-6 w-6" />
                    <span className="font-bold">DriveGuru</span>
                </Link>
                <div className="flex flex-col space-y-2">
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" /> Home
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/feed">
                            <Rss className="mr-2 h-4 w-4" /> Feed
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/groups">
                            <Users className="mr-2 h-4 w-4" /> Groups
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
                        <Link href="/guides">
                            <BookOpen className="mr-2 h-4 w-4" /> Guides
                        </Link>
                    </Button>
                    {installPrompt && (
                      <Button onClick={() => setShowInstallDialog(true)} variant="ghost" className="justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Install App
                      </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
        
        <Link href="/" className="mr-auto flex items-center space-x-2">
          <Icons.logo className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">DriveGuru</span>
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
                <Link href="/feed">
                    <Rss className="mr-2 h-4 w-4" />
                    Feed
                </Link>
            </Button>
             <Button asChild variant="ghost">
                <Link href="/groups">
                    <Users className="mr-2 h-4 w-4" />
                    Groups
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
                <Link href="/guides">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Guides
                </Link>
              </Button>
             {installPrompt && (
                <Button onClick={() => setShowInstallDialog(true)} variant="outline" size="sm" className="mr-2">
                    <Download className="mr-2 h-4 w-4" />
                    Install
                </Button>
            )}
          </nav>
            
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <>
                <Notifications />
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
              </>
            ) : (
              <nav className='flex items-center'>
                <Button asChild variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup/role">Sign Up</Link>
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
    <InstallPwaDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} />
    </>
  );
}
