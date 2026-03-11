
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc } from 'firebase/firestore';
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
import { User as UserIcon, LogOut, LayoutDashboard, Home, Award, Briefcase, Moon, Sun, Menu, Rss, Users, BookOpen, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNowStrict } from 'date-fns';

type Notification = {
    id: string;
    type: 'comment_reply' | 'post_like' | 'new_follower' | 'group_approval';
    message: string;
    link: string;
    read: boolean;
    actorId: string;
    actorName: string;
    actorPhotoUrl: string;
    createdAt: any;
}

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Feed', href: '/feed', icon: Rss },
  { label: 'Jobs', href: '/vacancies', icon: Briefcase },
  { label: 'Groups', href: '/groups', icon: Users },
  { label: 'Featured', href: '/featured-experts', icon: Award },
  { label: 'Guides', href: '/guides', icon: BookOpen },
];

function NotificationCenter() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);

    const notifsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
    }, [firestore, user]);

    const { data: notifications, isLoading } = useCollection<Notification>(notifsQuery);

    const unreadCount = useMemo(() => {
        return notifications?.filter(n => !n.read).length || 0;
    }, [notifications]);

    const markAsRead = async (notifId: string) => {
        if (!user || !firestore) return;
        const notifRef = doc(firestore, 'users', user.uid, 'notifications', notifId);
        await updateDoc(notifRef, { read: true });
    };

    const markAllAsRead = async () => {
        if (!user || !firestore || !notifications) return;
        const unread = notifications.filter(n => !n.read);
        for (const notif of unread) {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', notif.id);
            updateDoc(notifRef, { read: true });
        }
    };

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-white/10 group">
                    <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white ring-4 ring-background animate-in zoom-in">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-[#24262d] border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300" align="end">
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
                    <h4 className="font-black text-white text-xs uppercase italic tracking-[0.2em]">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 px-3 text-[9px] font-black uppercase text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-xl">
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                    ) : !notifications || notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 p-8 text-center opacity-40">
                            <Bell className="h-14 w-14 mb-4 text-muted-foreground" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                                <Link 
                                    key={notif.id} 
                                    href={notif.link} 
                                    className={cn(
                                        "flex items-start gap-4 p-5 transition-all hover:bg-white/5",
                                        !notif.read && "bg-orange-500/[0.03]"
                                    )}
                                    onClick={() => {
                                        markAsRead(notif.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    <Avatar className="h-11 w-11 shrink-0 border-2 border-white/10 shadow-lg">
                                        <AvatarImage src={notif.actorPhotoUrl} className="object-cover" />
                                        <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xs">
                                            {notif.actorName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1.5">
                                        <p className="text-xs text-white leading-relaxed">
                                            <span className="font-black uppercase italic text-orange-500">{notif.actorName}</span>{' '}
                                            <span className="text-muted-foreground font-medium">{notif.type === 'new_follower' ? 'started following your professional profile.' : notif.message}</span>
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                                {notif.createdAt ? formatDistanceToNowStrict(notif.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </p>
                                            {!notif.read && <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && firestore) {
      const superAdminDocRef = doc(firestore, 'roles_super_admin', user.uid);
      const unsub = onSnapshot(superAdminDocRef, (docSnapshot) => {
        setIsSuperAdmin(docSnapshot.exists());
      });
      return () => unsub();
    } else if (!isUserLoading) {
      setIsSuperAdmin(false);
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden mr-2">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-background border-r border-white/5">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <Icons.logo className="h-6 w-6" /> DriveGuru
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Button 
                                key={item.href} 
                                asChild 
                                variant={isActive ? "secondary" : "ghost"} 
                                className="justify-start h-12 rounded-xl" 
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <Link href={item.href}>
                                    <item.icon className={cn("mr-2 h-4 w-4", isActive && "stroke-[2px] text-orange-500")} /> {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
        
        <Link href="/" className="mr-auto flex items-center space-x-2">
          <Icons.logo className="h-6 w-6 text-orange-500" />
          <span className="hidden font-black sm:inline-block tracking-tighter text-lg">DriveGuru</span>
        </Link>

        <div className="flex items-center justify-end space-x-2 sm:space-x-4">
          {mounted ? (
            <>
              <nav className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Button 
                            key={item.href} 
                            asChild 
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "rounded-lg px-4 transition-all duration-300",
                                isActive 
                                    ? "bg-orange-500 text-white font-black hover:bg-orange-600 shadow-md shadow-orange-500/20" 
                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Link href={item.href}>
                                <item.icon className={cn("mr-2 h-4 w-4", isActive && "stroke-[2.5px]")} /> {item.label}
                            </Link>
                        </Button>
                    )
                })}
              </nav>

              <div className="flex items-center gap-1 sm:gap-2">
                {!isUserLoading && user ? (
                  <>
                    <NotificationCenter />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full group">
                            <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background group-hover:ring-primary/50 transition-all">
                            <AvatarImage src={user.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{getInitials(user.email)}</AvatarFallback>
                            </Avatar>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 p-2 bg-[#24262d] border-white/10 rounded-2xl shadow-2xl" align="end">
                        <DropdownMenuLabel className="font-normal px-4 py-3">
                            <div className="flex flex-col space-y-1">
                            <p className="text-sm font-black text-white leading-none">Account Settings</p>
                            <p className="text-xs leading-none text-muted-foreground font-medium">{user.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={() => router.push(dashboardPath)} className="font-bold h-11 rounded-xl focus:bg-white/5 cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4 text-orange-500" /> Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-500 font-bold h-11 rounded-xl focus:text-red-500 focus:bg-red-500/5 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" /> Log out
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : !isUserLoading ? (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="font-bold rounded-xl px-4 hover:bg-white/5"><Link href="/login">Login</Link></Button>
                    <Button asChild size="sm" className="font-black px-6 bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20"><Link href="/signup/role">Join</Link></Button>
                  </div>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-white/5"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="h-9 w-32 bg-white/5 rounded-xl animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
