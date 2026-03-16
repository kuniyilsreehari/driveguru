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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LayoutDashboard, Home, Award, Briefcase, Moon, Sun, Rss, Users, BookOpen, Bell, CheckCircle2, Loader2, Menu, Search, ShieldCheck, Lock, Info, Cookie, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNowStrict } from 'date-fns';

type Notification = {
    id: string;
    type: string;
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
  { label: 'Groups', href: '/groups', icon: Users },
  { label: 'Jobs', href: '/vacancies', icon: Briefcase },
  { label: 'Featured', href: '/featured-experts', icon: Award },
];

function SiteInfoPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/5 group">
                    <Lock className="h-3.5 w-3.5 text-green-500/70 group-hover:text-green-500 transition-colors" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-[#24262d] border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" align="start" sideOffset={10}>
                <div className="p-5 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3 mb-1">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        <h4 className="font-black text-white text-sm uppercase italic tracking-widest">Connection is secure</h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Your information (for example, passwords or credit card numbers) is private when it is sent to this site.</p>
                </div>
                <div className="p-2">
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl hover:bg-white/5 px-3">
                        <Cookie className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div className="text-left">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight">Cookies and site data</p>
                            <p className="text-[9px] text-muted-foreground">Managing local preferences</p>
                        </div>
                        <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/30" />
                    </Button>
                    <Link href="/terms">
                        <Button variant="ghost" className="w-full justify-start h-12 rounded-xl hover:bg-white/5 px-3">
                            <Info className="h-4 w-4 mr-3 text-muted-foreground" />
                            <div className="text-left">
                                <p className="text-[11px] font-black text-white uppercase tracking-tight">About DriveGuru</p>
                                <p className="text-[9px] text-muted-foreground">Perspectives and source info</p>
                            </div>
                            <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/30" />
                        </Button>
                    </Link>
                </div>
                <div className="p-4 bg-white/5 text-center">
                    <p className="text-[8px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Verified Secure by Firebase</p>
                </div>
            </PopoverContent>
        </Popover>
    );
}

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

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-white/10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white ring-2 ring-background">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-[#24262d] border-white/10 rounded-3xl overflow-hidden shadow-2xl" align="end">
                <div className="p-4 border-b border-white/5 bg-white/5">
                    <h4 className="font-black text-white text-xs uppercase italic tracking-widest">Activity</h4>
                </div>
                <ScrollArea className="h-[350px]">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                    ) : !notifications || notifications.length === 0 ? (
                        <div className="p-8 text-center opacity-40 italic text-[10px] font-black uppercase">No activity yet.</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                                <Link 
                                    key={notif.id} 
                                    href={notif.link} 
                                    className={cn("flex items-start gap-3 p-4 transition-all hover:bg-white/5", !notif.read && "bg-orange-500/5")}
                                    onClick={() => markAsRead(notif.id)}
                                >
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={notif.actorPhotoUrl} />
                                        <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-[10px]">{notif.actorName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[11px] text-white leading-tight">
                                            <span className="font-black text-orange-500 uppercase">{notif.actorName}</span> {notif.message}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase">{notif.createdAt ? formatDistanceToNowStrict(notif.createdAt.toDate(), { addSuffix: true }) : 'now'}</p>
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
    }
  }, [user, firestore]);

  const dashboardPath = isSuperAdmin ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1a1c23]/95 backdrop-blur-xl border-b border-white/5">
      <div className="container flex h-16 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/" className="flex items-center gap-2">
                <div className="bg-orange-500/10 p-1.5 rounded-lg border border-orange-500/20">
                    <Icons.logo className="h-6 w-6 text-orange-500" />
                </div>
                <span className="hidden sm:inline-block font-black text-xl tracking-tighter text-white uppercase italic">DriveGuru</span>
            </Link>
            <SiteInfoPopover />
        </div>

        <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm" className={cn("rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest", pathname === item.href ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}>
                    <Link href={item.href}><item.icon className="mr-2 h-4 w-4" /> {item.label}</Link>
                </Button>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <>
              {user && <NotificationCenter />}
              
              {!isUserLoading && user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-white/5 hover:ring-orange-500/50 transition-all p-0 overflow-hidden">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL || undefined} className="object-cover" />
                                <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xs">{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 p-2 bg-[#24262d] border-white/10 rounded-2xl shadow-2xl" align="end">
                        <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest px-4 py-3 opacity-50">Profile Settings</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={() => router.push(dashboardPath)} className="font-bold h-11 rounded-xl focus:bg-white/5 cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4 text-orange-500" /> Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => signOut(auth!)} className="text-red-500 font-bold h-11 rounded-xl focus:text-red-500 focus:bg-red-500/5 cursor-pointer mt-1">
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              ) : !isUserLoading && (
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/5"><Link href="/login">Login</Link></Button>
                    <Button asChild size="sm" className="font-black text-[10px] uppercase tracking-widest bg-orange-500 hover:bg-orange-600 rounded-xl px-5 h-9 shadow-lg shadow-orange-500/20"><Link href="/signup/role">Join</Link></Button>
                </div>
              )}

              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/5" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
