
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, where, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, UserX, Crown, Sparkles, User as UserIcon, Save, Briefcase, Building, MessageSquare, Search, PlusCircle, Download, IndianRupee, Upload, HardDriveDownload, Megaphone, Rss, TrendingUp, PieChart, Activity, ChevronLeft, ChevronRight, Check, Gift, Phone, Eye, Layout, Hash, SortAsc, LayoutGrid, CheckCircle2, ShieldAlert, Link as LinkIcon, Video, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateUserForm } from '@/components/auth/create-user-form';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { format, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { exportAllData } from '@/ai/flows/export-data-flow';
import { importUsers } from '@/ai/flows/import-users-flow';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { cn } from '@/lib/utils';
import type { Vacancy } from '@/app/vacancies/page';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell
} from 'recharts';

export type HomepageCategory = {
    id: string;
    name: string;
    icon: string;
};

type ExpertUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
    verified?: boolean;
    isFeatured?: boolean;
    featuredOrder?: number;
    showInRecent?: boolean;
    recentOrder?: number;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    referralCode?: string;
    referralPoints?: number;
    referralCount?: number;
    referredByCode?: string | null;
    createdAt?: Timestamp;
    profession?: string;
    phoneNumber?: string;
    companyName?: string;
    following?: string[];
    city?: string;
    state?: string;
    pincode?: string;
};

type Payment = {
    id: string;
    userId: string;
    plan: 'Premier' | 'Super Premier' | 'Verification';
    billingCycle: string;
    amount: number;
    currency: string;
    orderId: string;
    status: 'pending' | 'successful' | 'failed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

type Post = {
    id: string;
    authorId: string;
    authorName?: string;
    title?: string;
    content: string;
    createdAt: Timestamp;
};

type AppConfig = {
    featuredExpertsLimit?: number;
    announcementText?: string;
    isAnnouncementEnabled?: boolean;
    announcementSpeed?: number;
    isPaymentsEnabled?: boolean;
    paymentMethod?: 'API' | 'Link';
    publicApiKey?: string;
    referralRewardPoints?: number;
    homepageCategories?: HomepageCategory[];
    departments?: string[];
    pricingModels?: string[];
    verificationFee?: number;
    centralContactPhone?: string;
    isRecentProfessionalsEnabled?: boolean;
    verificationPaymentLink?: string;
    premierPaymentLink?: string;
    superPremierPaymentLink?: string;
    introVideoUrl?: string;
};

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVacancyDialogOpen, setIsVacancyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [awardPoints, setAwardPoints] = useState(100);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified' | 'premier' | 'super' | 'referrers'>('all');

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [vacancyPage, setVacancyPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);

  // App Config States
  const [featuredLimit, setFeaturedLimit] = useState(3);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementSpeed, setAnnouncementSpeed] = useState(20);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'API' | 'Link'>('Link');
  const [verificationFee, setVerificationFee] = useState(49);
  const [verificationLink, setVerificationLink] = useState("");
  const [premierLink, setPremierLink] = useState("");
  const [superPremierLink, setSuperPremierLink] = useState("");
  const [centralContactPhone, setCentralContactPhone] = useState("");
  const [isRecentProfessionalsEnabled, setIsRecentProfessionalsEnabled] = useState(true);
  const [publicApiKey, setPublicApiKey] = useState("");
  const [referralPoints, setReferralPoints] = useState(100);
  const [homepageCategories, setHomepageCategories] = useState<HomepageCategory[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [introVideoUrl, setIntroVideoUrl] = useState("");

  const [hasSuperAdminClaim, setHasSuperAdminClaim] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user) {
        user.getIdTokenResult().then(token => {
            if (token.claims.role === 'superAdmin') {
                setHasSuperAdminClaim(true);
            }
        });
    }
  }, [user]);

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const isDevUid = user.uid === 'UtMmElKnuMXbOM2cBP4oM6bFTre2';
    const isDevEmail = user.email === 'kuniyilsreehari@gmail.com' || user.email === 'royatosolutions@gmail.com';
    return isDevUid || isDevEmail || hasSuperAdminClaim || !!superAdminData;
  }, [user, superAdminData, hasSuperAdminClaim]);

  const usersQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersQuery);

  const paymentsQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'payments'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsQuery);

  const vacanciesQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: vacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(vacanciesQuery);

  const postsQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

  useEffect(() => {
    if (appConfig) {
      setFeaturedLimit(appConfig.featuredExpertsLimit || 3);
      setAnnouncementText(appConfig.announcementText || "");
      setAnnouncementEnabled(appConfig.isAnnouncementEnabled || false);
      setAnnouncementSpeed(appConfig.announcementSpeed || 20);
      setPaymentsEnabled(appConfig.isPaymentsEnabled !== false);
      setPaymentMethod(appConfig.paymentMethod || 'Link');
      setVerificationFee(appConfig.verificationFee || 49);
      setVerificationLink(appConfig.verificationPaymentLink || "");
      setPremierLink(appConfig.premierPaymentLink || "");
      setSuperPremierLink(appConfig.superPremierPaymentLink || "");
      setCentralContactPhone(appConfig.centralContactPhone || "");
      setIsRecentProfessionalsEnabled(appConfig.isRecentProfessionalsEnabled !== false);
      setPublicApiKey(appConfig.publicApiKey || "");
      setReferralPoints(appConfig.referralRewardPoints || 100);
      setHomepageCategories(appConfig.homepageCategories || []);
      setDepartments(appConfig.departments || []);
      setIntroVideoUrl(appConfig.introVideoUrl || "");
    }
  }, [appConfig]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, verified: 0, unverified: 0, premier: 0, super: 0, referrals: 0, referrers: 0 };
    return {
        total: users.length,
        verified: users.filter(u => u.verified).length,
        unverified: users.filter(u => !u.verified).length,
        premier: users.filter(u => u.tier === 'Premier').length,
        super: users.filter(u => u.tier === 'Super Premier').length,
        referrals: users.filter(u => !!u.referredByCode).length,
        referrers: users.filter(u => (u.referralPoints || 0) > 0 || (u.referralCount || 0) > 0).length,
    };
  }, [users]);

  const reportData = useMemo(() => {
    if (!users || !payments || !posts) return null;

    const successfulPayments = payments.filter(p => p.status === 'successful');
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const revenueByPlan = [
        { name: 'Premier', value: successfulPayments.filter(p => p.plan === 'Premier').reduce((sum, p) => sum + p.amount, 0), color: '#9333ea' },
        { name: 'Super Premier', value: successfulPayments.filter(p => p.plan === 'Super Premier').reduce((sum, p) => sum + p.amount, 0), color: '#2563eb' },
        { name: 'Verification', value: successfulPayments.filter(p => p.plan === 'Verification').reduce((sum, p) => sum + p.amount, 0), color: '#16a34a' },
    ];

    const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
    });

    const userGrowth = months.map(month => {
        const count = users.filter(u => {
            const date = u.createdAt?.toDate();
            return date && isSameMonth(date, month);
        }).length;
        return {
            name: format(month, 'MMM'),
            users: count
        };
    });

    return {
        totalRevenue,
        revenueByPlan,
        userGrowth,
        totalPosts: posts.length,
    };
  }, [users, payments, posts]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const queryStr = userSearchQuery.toLowerCase();
    return users.filter(u => {
        const matchesSearch = 
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(queryStr) ||
            u.email?.toLowerCase().includes(queryStr) ||
            u.referralCode?.toLowerCase().includes(queryStr) ||
            u.phoneNumber?.toLowerCase().includes(queryStr) ||
            u.profession?.toLowerCase().includes(queryStr) ||
            u.city?.toLowerCase().includes(queryStr) ||
            u.state?.toLowerCase().includes(queryStr) ||
            u.pincode?.toLowerCase().includes(queryStr) ||
            u.companyName?.toLowerCase().includes(queryStr);
        
        const matchesFilter = 
            userFilter === 'all' ? true :
            userFilter === 'verified' ? u.verified :
            userFilter === 'unverified' ? !u.verified :
            userFilter === 'premier' ? u.tier === 'Premier' :
            userFilter === 'super' ? u.tier === 'Super Premier' : 
            userFilter === 'referrers' ? ((u.referralPoints || 0) > 0 || (u.referralCount || 0) > 0) : true;

        return matchesSearch && matchesFilter;
    });
  }, [users, userSearchQuery, userFilter]);

  const rankingUsers = useMemo(() => {
    if (!users) return [];
    return [...users]
        .filter(u => (u.referralPoints || 0) > 0 || (u.referralCount || 0) > 0)
        .sort((a, b) => {
            const aPoints = a.referralPoints || 0;
            const bPoints = b.referralPoints || 0;
            if (bPoints !== aPoints) return bPoints - aPoints;
            return (b.referralCount || 0) - (a.referralCount || 0);
        });
  }, [users]);

  const sanitizePhoneNumber = useCallback((phone?: string) => {
    if (!phone) return 'N/A';
    const digits = phone.replace(/\D/g, '');
    const clean = digits.length > 10 ? digits.slice(-10) : digits;
    return `+91 ${clean.replace(/(\d{5})(\d{5})/, '$1 $2')}`;
  }, []);

  const handleSaveSettings = async () => {
    if (!appConfigDocRef) return;
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(appConfigDocRef, {
        featuredExpertsLimit: featuredLimit,
        announcementText,
        isAnnouncementEnabled: announcementEnabled,
        announcementSpeed,
        isPaymentsEnabled: paymentsEnabled,
        paymentMethod,
        verificationFee,
        verificationPaymentLink: verificationLink,
        premierPaymentLink: premierLink,
        superPremierPaymentLink: superPremierLink,
        centralContactPhone,
        isRecentProfessionalsEnabled,
        publicApiKey,
        referralRewardPoints: referralPoints,
        homepageCategories,
        departments,
        introVideoUrl,
      }, { merge: true });
      toast({ title: "Settings Published" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserTier = async (userId: string, newTier: 'Standard' | 'Premier' | 'Super Premier') => {
    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDocumentNonBlocking(userRef, { tier: newTier });
      toast({ title: "Tier Updated", description: `User tier changed to ${newTier}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleUpdateFeaturedOrder = async (userId: string, order: string) => {
    const numOrder = parseInt(order);
    if (isNaN(numOrder)) return;
    try {
        await updateDocumentNonBlocking(doc(firestore, 'users', userId), { featuredOrder: numOrder });
        toast({ title: "Carousel Position Set" });
    } catch (e) {
        toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleUpdateRecentOrder = async (userId: string, order: string) => {
    const numOrder = parseInt(order);
    if (isNaN(numOrder)) return;
    try {
        await updateDocumentNonBlocking(doc(firestore, 'users', userId), { recentOrder: numOrder });
        toast({ title: "Recent Grid Position Set" });
    } catch (e) {
        toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleToggleFeatured = async (userId: string, isFeatured: boolean) => {
    try {
        const userRef = doc(firestore, 'users', userId);
        const updates: any = { isFeatured };
        if (isFeatured) {
            const u = users?.find(user => user.id === userId);
            if (u && (u.featuredOrder === undefined || u.featuredOrder === null)) {
                updates.featuredOrder = 999;
            }
        }
        await updateDocumentNonBlocking(userRef, updates);
        toast({ title: isFeatured ? "Expert Featured" : "Feature Removed" });
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  }

  const handleToggleRecent = async (userId: string, showInRecent: boolean) => {
    try {
        const userRef = doc(firestore, 'users', userId);
        const updates: any = { showInRecent };
        if (showInRecent) {
            const u = users?.find(user => user.id === userId);
            if (u && (u.recentOrder === undefined || u.recentOrder === null)) {
                updates.recentOrder = 999;
            }
        }
        await updateDocumentNonBlocking(userRef, updates);
        toast({ title: showInRecent ? "Added to Recent Grid" : "Removed from Recent Grid" });
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  }

  const handleAwardPoints = async () => {
    if (!selectedUser) return;
    try {
        const userRef = doc(firestore, 'users', selectedUser.id);
        await updateDocumentNonBlocking(userRef, { referralPoints: increment(awardPoints) });
        toast({ title: "Points Awarded", description: `Successfully awarded ${awardPoints} points to ${selectedUser.firstName} ${selectedUser.lastName}` });
        setIsAwardDialogOpen(false);
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    try {
        await deleteDoc(doc(firestore, 'posts', selectedPost.id));
        toast({ title: "Post Removed" });
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    } finally {
        setIsPostDeleteDialogOpen(false);
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
        await deleteDoc(doc(firestore, 'users', selectedUser.id));
        toast({ title: "User Deleted" });
    } catch (e) {
        toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
        setIsDeleteDialogOpen(false);
    }
  }

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `driveguru-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      toast({ title: "Export Complete" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!users) return;
    const headers = ["S.No", "Expert Name", "Profession/Role", "Email", "Phone Number", "City", "State", "Pincode", "Tier", "Verified", "Referral Code", "Referral Points", "Referral Joins", "Joined Date"];
    const rows = users.map((u, i) => [
        i + 1,
        `"${u.firstName} ${u.lastName}"`,
        `"${u.profession || u.role}"`,
        `"${u.email || ''}"`,
        `"${sanitizePhoneNumber(u.phoneNumber)}"`,
        `"${u.city || ''}"`,
        `"${u.state || ''}"`,
        `"${u.pincode || ''}"`,
        `"${u.tier || 'Standard'}"`,
        `"${u.verified ? 'Yes' : 'No'}"`,
        `"${u.referralCode || ''}"`,
        u.referralPoints || 0,
        u.referralCount || 0,
        u.createdAt ? format(u.createdAt.toDate(), 'dd-MM-yyyy') : '---'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `driveguru-expert-registry-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast({ title: "Registry Exported", description: "Excel compatible file is ready." });
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
            const result = await importUsers({ csvData: text });
            toast({
                title: "Import Finished",
                description: `Processed: ${result.processedCount}, Created: ${result.createdCount}, Updated: ${result.updatedCount}`,
            });
        } catch (err) {
            toast({ variant: "destructive", title: "Import Failed" });
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsDataURL(file);
  };

  if (isUserLoading || isRoleLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin text-orange-500" /></div>;
  
  if (!isSuperAdmin) {
    return (
        <div className="flex h-screen flex-col items-center justify-center p-8 text-center bg-background text-foreground">
            <div className="bg-red-500/10 p-6 rounded-[2rem] mb-6">
                <Shield className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-3xl font-black uppercase italic">Access Denied</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">This area is reserved for Super Admins. Please log in with an authorized account.</p>
            <Button className="mt-8 rounded-2xl h-14 px-8 font-black bg-orange-500" onClick={() => router.push('/')}>Return to Homepage</Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-xl">
                <Shield className="h-10 w-10 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase italic">Super Admin</h1>
              <p className="text-muted-foreground text-sm font-medium">Welcome, {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl border-2 border-white/10 bg-transparent text-white hover:bg-white/10" onClick={() => auth && signOut(auth).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 h-12 rounded-xl mb-8">
            <TabsTrigger value="dashboard" className="rounded-lg font-bold">Management</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg font-bold">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg font-bold">Platform Settings</TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg font-bold">Data Control</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 space-y-8">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest">Total Experts</CardTitle></CardHeader><CardContent><div className="text-2xl font-black">{stats.total}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-green-500">Verified</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-green-500">{stats.verified}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-red-500">Unverified</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-red-500">{stats.unverified}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-purple-500">Premier</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-purple-500">{stats.premier}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-blue-500">Super</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-blue-500">{stats.super}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-orange-500">Referrals</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-orange-500">{stats.referrals}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-70 uppercase tracking-widest text-orange-500">Earners</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-orange-500">{stats.referrers}</div></CardContent></Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="flex w-full bg-secondary p-1 rounded-xl mb-6 overflow-x-auto h-auto sm:h-12">
                    <TabsTrigger value="users" className="flex-1 rounded-lg font-bold">Experts</TabsTrigger>
                    <TabsTrigger value="leaderboard" className="flex-1 rounded-lg font-bold">Rankings</TabsTrigger>
                    <TabsTrigger value="vacancies" className="flex-1 rounded-lg font-bold">Vacancies</TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 rounded-lg font-bold">Payments</TabsTrigger>
                    <TabsTrigger value="feed" className="flex-1 rounded-lg font-bold">Feed Removal</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase italic">Expert Registry</CardTitle>
                                    <CardDescription className="text-muted-foreground">Manage all registered professionals.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            { id: 'all', label: 'All Experts', count: stats.total },
                                            { id: 'verified', label: 'Verified', count: stats.verified, color: 'text-green-500' },
                                            { id: 'unverified', label: 'Unverified', count: stats.unverified, color: 'text-red-500' },
                                            { id: 'referrers', label: 'Top Referrers', count: stats.referrers, color: 'text-orange-500' },
                                            { id: 'premier', label: 'Premier', count: stats.premier, color: 'text-purple-500' },
                                            { id: 'super', label: 'Super Premier', count: stats.super, color: 'text-blue-500' },
                                        ].map((f) => (
                                            <Button
                                                key={f.id}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setUserFilter(f.id as any)}
                                                className={cn(
                                                    "rounded-xl px-3 h-9 text-[10px] font-black uppercase tracking-widest transition-all",
                                                    userFilter === f.id 
                                                        ? "bg-white/10 text-white" 
                                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <span className={cn(userFilter === f.id && f.color)}>{f.label}</span>
                                                <Badge variant="secondary" className="ml-2 bg-white/5 text-white border-none font-bold px-1.5 h-4 min-w-[1.25rem]">
                                                    {f.count}
                                                </Badge>
                                            </Button>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" className="rounded-xl border-white/10 h-9 font-black uppercase text-[10px]" onClick={handleExportCSV}>
                                        <Download className="mr-2 h-3.5 w-3.5" /> Export Registry (Excel/CSV)
                                    </Button>
                                </div>

                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                                    <Input 
                                        placeholder="Search experts by name, profession, or pincode..." 
                                        className="pl-10 h-12 bg-white/5 border-none rounded-xl text-white placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="w-[60px] font-bold text-white text-center text-[10px] uppercase tracking-widest">S.No</TableHead>
                                            <TableHead className="font-bold text-white text-[10px] uppercase tracking-widest">Expert Profile</TableHead>
                                            <TableHead className="font-bold text-white text-center text-[10px] uppercase tracking-widest">Contact</TableHead>
                                            <TableHead className="font-bold text-white text-center text-[10px] uppercase tracking-widest">Tier</TableHead>
                                            <TableHead className="font-bold text-white text-center text-[10px] uppercase tracking-widest">Joined</TableHead>
                                            <TableHead className="font-bold text-white text-center text-[10px] uppercase tracking-widest">Verified</TableHead>
                                            <TableHead className="font-bold text-orange-500 text-center text-[10px] uppercase tracking-widest">Carousel</TableHead>
                                            <TableHead className="font-bold text-blue-500 text-center text-[10px] uppercase tracking-widest">Recent</TableHead>
                                            <TableHead className="text-right font-bold text-white"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const paginated = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                                            if (paginated.length === 0 && !isUsersLoading) {
                                                return <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground italic">No experts found matching your criteria.</TableCell></TableRow>;
                                            }
                                            return paginated.map((u, index) => {
                                                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                                return (
                                                    <TableRow key={u.id} className="hover:bg-white/5 border-white/5 h-24">
                                                        <TableCell className="text-center font-bold text-muted-foreground text-xs">{globalIndex}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                                                                    <AvatarImage src={u.photoUrl} className="object-cover" />
                                                                    <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black">{u.firstName[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="font-black text-sm text-white">{u.firstName} {u.lastName}</div>
                                                                        {!u.verified && <ShieldAlert className="h-3.5 w-3.5 text-orange-500/40" />}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate max-w-[150px]">{u.profession || u.role}</div>
                                                                    <div className="flex items-center gap-2 mt-1.5 bg-[#1a1c23] w-fit px-2 py-1 rounded-lg border border-white/10 shadow-inner">
                                                                        <Gift className="h-3 w-3 text-orange-500" />
                                                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">{u.referralPoints || 0} PTS</span>
                                                                        <span className="text-[10px] text-white/20">|</span>
                                                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-tighter">{u.referralCount || 0} JOINS</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs font-black text-white/80">{sanitizePhoneNumber(u.phoneNumber)}</span>
                                                                {u.email && <span className="text-[9px] text-muted-foreground lowercase truncate max-w-[120px]">{u.email}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {u.tier === 'Super Premier' ? <Sparkles className="h-4 w-4 text-blue-500 mx-auto" /> : u.tier === 'Premier' ? <Crown className="h-4 w-4 text-purple-500 mx-auto" /> : <UserIcon className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                                                {u.createdAt ? format(u.createdAt.toDate(), 'dd-MM-yyyy') : '---'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-center">
                                                                <Switch checked={u.verified} onCheckedChange={(v) => updateDocumentNonBlocking(doc(firestore, 'users', u.id), { verified: v })} className="scale-75 data-[state=checked]:bg-green-500" />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <Switch checked={u.isFeatured} onCheckedChange={(v) => handleToggleFeatured(u.id, v)} className="scale-75 data-[state=checked]:bg-orange-500" />
                                                                {u.isFeatured && (
                                                                    <div className="flex items-center gap-1">
                                                                        <SortAsc className="h-3 w-3 text-orange-500/50" />
                                                                        <Input 
                                                                            type="number" 
                                                                            defaultValue={u.featuredOrder || 0}
                                                                            onBlur={(e) => handleUpdateFeaturedOrder(u.id, e.target.value)}
                                                                            className="w-10 h-6 px-1 text-center bg-white/5 border-none text-[10px] font-black text-orange-500 rounded shadow-inner"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <Switch checked={u.showInRecent} onCheckedChange={(v) => handleToggleRecent(u.id, v)} className="scale-75 data-[state=checked]:bg-blue-500" />
                                                                {u.showInRecent && (
                                                                    <div className="flex items-center gap-1">
                                                                        <LayoutGrid className="h-3 w-3 text-blue-500/50" />
                                                                        <Input 
                                                                            type="number" 
                                                                            defaultValue={u.recentOrder || 0}
                                                                            onBlur={(e) => handleUpdateRecentOrder(u.id, e.target.value)}
                                                                            className="w-10 h-6 px-1 text-center bg-white/5 border-none text-[10px] font-black text-blue-500 rounded shadow-inner"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-[#24262d] text-white border-white/10 rounded-xl shadow-2xl p-1">
                                                                    <DropdownMenuItem onClick={() => router.push(`/expert/${u.id}`)} className="rounded-lg h-10"><Eye className="mr-2 h-4 w-4 text-orange-500" /> View Profile</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }} className="rounded-lg h-10"><Edit className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsAwardDialogOpen(true); }} className="rounded-lg h-10 text-orange-500"><Gift className="mr-2 h-4 w-4" /> Award Points</DropdownMenuItem>
                                                                    <DropdownMenuSub>
                                                                        <DropdownMenuSubTrigger className="rounded-lg h-10"><Crown className="mr-2 h-4 w-4" /> Change Tier</DropdownMenuSubTrigger>
                                                                        <DropdownMenuPortal>
                                                                            <DropdownMenuSubContent className="bg-[#24262d] text-white border-white/10 rounded-xl shadow-2xl p-1 min-w-[180px]">
                                                                                <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Standard')} className="rounded-lg h-10">Standard (Base)</DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Premier')} className="text-purple-500 font-bold rounded-lg h-10"><Crown className="mr-2 h-3 w-3" /> Premier</DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Super Premier')} className="text-blue-500 font-bold rounded-lg h-10"><Sparkles className="mr-2 h-3 w-3" /> Super Premier</DropdownMenuItem>
                                                                            </DropdownMenuSubContent>
                                                                        </DropdownMenuPortal>
                                                                    </DropdownMenuSub>
                                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                                    <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg h-10" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Delete Expert</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            });
                                        })()}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {currentPage}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaderboard">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase italic">Referral Rankings</CardTitle>
                                    <CardDescription className="text-muted-foreground">Experts with the highest engagement points.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="w-[60px] font-bold text-white text-center">Rank</TableHead>
                                            <TableHead className="font-bold text-white">Top Referrer</TableHead>
                                            <TableHead className="font-bold text-white text-center">Premium Credits</TableHead>
                                            <TableHead className="font-bold text-white text-center">Total Joins</TableHead>
                                            <TableHead className="text-right font-bold text-white">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isUsersLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader className="animate-spin mx-auto text-orange-500" /></TableCell></TableRow>
                                        ) : rankingUsers.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No experts have earned referral points yet.</TableCell></TableRow>
                                        ) : rankingUsers.slice((rankingPage - 1) * ITEMS_PER_PAGE, rankingPage * ITEMS_PER_PAGE).map((u, idx) => {
                                            const globalRank = (rankingPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                            return (
                                                <TableRow key={u.id} className="hover:bg-white/5 border-white/5 h-20">
                                                    <TableCell className="text-center font-black text-orange-500 text-lg">#{globalRank}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                                                                <AvatarImage src={u.photoUrl} />
                                                                <AvatarFallback>{u.firstName[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="space-y-0.5">
                                                                <div className="font-black text-white">{u.firstName} {u.lastName}</div>
                                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{u.profession || u.role}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-black text-orange-500 text-xl">{u.referralPoints || 0}</TableCell>
                                                    <TableCell className="text-center font-black text-white text-xl">{u.referralCount || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className="border-orange-500/30 text-orange-500 font-black uppercase text-[9px] tracking-widest">{u.referralCode}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {rankingPage}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setRankingPage(prev => Math.max(prev - 1, 1))} disabled={rankingPage === 1} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setRankingPage(prev => prev + 1)} disabled={rankingPage >= Math.ceil(rankingUsers.length / ITEMS_PER_PAGE)} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vacancies">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-6 w-6 text-orange-500" />
                                    <div>
                                        <CardTitle className="text-2xl font-black uppercase italic">Platform Openings</CardTitle>
                                        <CardDescription className="text-muted-foreground">Review and moderate job vacancies.</CardDescription>
                                    </div>
                                </div>
                                <Button onClick={() => { setSelectedVacancy(null); setIsVacancyDialogOpen(true); }} className="rounded-xl font-black bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"><PlusCircle className="mr-2 h-4 w-4" /> Post Admin Vacancy</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="w-[60px] font-bold text-white text-center">S.No</TableHead>
                                            <TableHead className="font-bold text-white">Title</TableHead>
                                            <TableHead className="font-bold text-white">Company</TableHead>
                                            <TableHead className="font-bold text-white text-center">Status</TableHead>
                                            <TableHead className="text-right font-bold text-white">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isVacanciesLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader className="animate-spin mx-auto text-orange-500" /></TableCell></TableRow>
                                        ) : vacancies?.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No job openings recorded.</TableCell></TableRow>
                                        ) : vacancies?.slice((vacancyPage - 1) * ITEMS_PER_PAGE, vacancyPage * ITEMS_PER_PAGE).map((v, idx) => {
                                            const globalIndex = (vacancyPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                            return (
                                                <TableRow key={v.id} className="hover:bg-white/5 border-white/5 h-20">
                                                    <TableCell className="text-center font-bold text-muted-foreground text-xs">{globalIndex}</TableCell>
                                                    <TableCell className="font-black text-white italic">{v.title}</TableCell>
                                                    <TableCell className="text-muted-foreground font-bold text-xs uppercase tracking-wider">{v.companyName}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={v.status === 'Approved' ? 'default' : v.status === 'Rejected' ? 'destructive' : 'secondary'} className="text-[10px] font-black uppercase tracking-tighter">
                                                            {v.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="outline" size="sm" className="rounded-full h-10 w-10 p-0 border-green-500/20 text-green-500 hover:bg-green-500/10" onClick={() => updateDocumentNonBlocking(doc(firestore, 'vacancies', v.id), { status: 'Approved' })}><Check className="h-4 w-4" /></Button>
                                                            <Button variant="outline" size="sm" className="rounded-full h-10 w-10 p-0 border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => updateDocumentNonBlocking(doc(firestore, 'vacancies', v.id), { status: 'Rejected' })}><Ban className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/30 hover:text-red-500" onClick={() => deleteDocumentNonBlocking(doc(firestore, 'vacancies', v.id))}><Trash2 className="h-5 w-5" /></Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {vacancyPage}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setVacancyPage(prev => Math.max(prev - 1, 1))} disabled={vacancyPage === 1} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setVacancyPage(prev => prev + 1)} disabled={vacancyPage >= Math.ceil((vacancies?.length || 0) / ITEMS_PER_PAGE)} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <IndianRupee className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase italic">Transaction Ledger</CardTitle>
                                    <CardDescription className="text-muted-foreground">Monitor revenue and payment attempts.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="w-[60px] font-bold text-white text-center">S.No</TableHead>
                                            <TableHead className="font-bold text-white">Order ID</TableHead>
                                            <TableHead className="font-bold text-white">Plan</TableHead>
                                            <TableHead className="font-bold text-center text-white">Amount</TableHead>
                                            <TableHead className="font-bold text-center text-white">Status</TableHead>
                                            <TableHead className="text-right font-bold text-white">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isPaymentsLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader className="animate-spin mx-auto text-orange-500" /></TableCell></TableRow>
                                        ) : payments?.slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE).map((p, idx) => {
                                            const globalIndex = (paymentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                            return (
                                                <TableRow key={p.id} className="hover:bg-white/5 border-white/5 h-16">
                                                    <TableCell className="text-center font-bold text-muted-foreground text-xs">{globalIndex}</TableCell>
                                                    <TableCell className="font-mono text-[10px] text-orange-500/70">{p.orderId}</TableCell>
                                                    <TableCell><Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter">{p.plan}</Badge></TableCell>
                                                    <TableCell className="text-center font-black text-white">₹{p.amount}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest", p.status === 'successful' ? "bg-green-500" : "bg-red-500/20 text-red-500 border border-red-500/30")}>{p.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-muted-foreground text-right">{p.createdAt ? format(p.createdAt.toDate(), 'PP p') : '---'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {paymentPage}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPaymentPage(prev => Math.max(prev - 1, 1))} disabled={paymentPage === 1} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setPaymentPage(prev => prev + 1)} disabled={paymentPage >= Math.ceil((payments?.length || 0) / ITEMS_PER_PAGE)} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="feed">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Rss className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase italic">Feed Moderation</CardTitle>
                                    <CardDescription className="text-muted-foreground">Monitor and remove community updates.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="w-[60px] font-bold text-white text-center">S.No</TableHead>
                                            <TableHead className="font-bold text-white">Author</TableHead>
                                            <TableHead className="font-bold text-white">Preview</TableHead>
                                            <TableHead className="text-right font-bold text-white">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isPostsLoading ? (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader className="animate-spin mx-auto text-orange-500" /></TableCell></TableRow>
                                        ) : posts?.slice((feedPage - 1) * ITEMS_PER_PAGE, feedPage * ITEMS_PER_PAGE).map((post, idx) => {
                                            const globalIndex = (feedPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                            return (
                                                <TableRow key={post.id} className="hover:bg-white/5 border-white/5 h-16">
                                                    <TableCell className="text-center font-bold text-muted-foreground text-xs">{globalIndex}</TableCell>
                                                    <TableCell className="font-black text-white text-xs">{post.authorName || 'Expert'}</TableCell>
                                                    <TableCell className="max-w-xs truncate text-[10px] text-muted-foreground italic font-medium">{post.content}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => { setSelectedPost(post); setIsPostDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {feedPage}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setFeedPage(prev => Math.max(prev - 1, 1))} disabled={feedPage === 1} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setFeedPage(prev => prev + 1)} disabled={feedPage >= Math.ceil((posts?.length || 0) / ITEMS_PER_PAGE)} className="rounded-xl h-9 border-white/10 bg-transparent text-white font-bold"><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="reports" className="mt-0 space-y-8">
            {mounted && reportData && (
              <>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none bg-card shadow-xl">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><TrendingUp className="h-3 w-3 text-green-500" /> Platform Revenue</CardDescription>
                            <CardTitle className="text-3xl font-black text-orange-500">₹{reportData.totalRevenue.toLocaleString()}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-none bg-card shadow-xl">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3 text-blue-500" /> Verification Rate</CardDescription>
                            <CardTitle className="text-3xl font-black">{stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-none bg-card shadow-xl">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Crown className="h-3 w-3 text-purple-500" /> Premium Users</CardDescription>
                            <CardTitle className="text-3xl font-black">{stats.premier + stats.super}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-none bg-card shadow-xl">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><MessageSquare className="h-3 w-3 text-orange-500" /> Community Content</CardDescription>
                            <CardTitle className="text-3xl font-black">{reportData.totalPosts} Posts</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 border-b border-white/5">
                            <CardTitle className="text-xl font-black flex items-center gap-2 uppercase italic"><TrendingUp className="h-5 w-5 text-orange-500" /> Expert Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportData.userGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8a92a6', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#8a92a6', fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor: '#24262d', border: 'none', borderRadius: '12px', fontSize: '12px'}} cursor={{fill: '#ffffff05'}} />
                                    <Bar dataKey="users" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                        <CardHeader className="bg-white/5 border-b border-white/5">
                            <CardTitle className="text-xl font-black flex items-center gap-2 uppercase italic"><PieChart className="h-5 w-5 text-orange-500" /> Revenue Split</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 h-[300px] flex items-center">
                            <div className="w-1/2 h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie data={reportData.revenueByPlan} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {reportData.revenueByPlan.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#24262d', border: 'none', borderRadius: '12px'}} />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-1/2 space-y-4">
                                {reportData.revenueByPlan.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{backgroundColor: item.color}} />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-white">₹{item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-6">
            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <IndianRupee className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black uppercase italic">Payment Architecture</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Choose between automated API processing or simplified static links.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 shadow-inner">
                        <div>
                            <Label className="text-base font-black uppercase italic">Global Payments</Label>
                            <p className="text-xs text-muted-foreground font-medium">Enable or disable entire transaction system.</p>
                        </div>
                        <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} className="data-[state=checked]:bg-orange-500" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black text-primary text-[10px] uppercase tracking-widest">Selected Gateway Method</Label>
                        <Select value={paymentMethod} onValueChange={(v: 'API' | 'Link') => setPaymentMethod(v)}>
                            <SelectTrigger className="rounded-xl h-14 bg-background border-none font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="API">Automated API (Cashfree Direct)</SelectItem>
                                <SelectItem value="Link">Static Links (Manual Approval)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-6 p-6 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Three-Model Static Links</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Verification Payment Link</Label>
                            <Input value={verificationLink} onChange={e => setVerificationLink(e.target.value)} className="bg-background border-none h-12 font-mono text-xs" placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Premier Plan Link</Label>
                            <Input value={premierLink} onChange={e => setPremierLink(e.target.value)} className="bg-background border-none h-12 font-mono text-xs" placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Super Premier Link</Label>
                            <Input value={superPremierLink} onChange={e => setSuperPremierLink(e.target.value)} className="bg-background border-none h-12 font-mono text-xs" placeholder="https://..." />
                        </div>
                    </div>
                </div>

                {paymentMethod === 'API' && (
                    <div className="space-y-6 p-6 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><Activity className="h-4 w-4" /> API Configuration (Automation)</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-black text-primary text-[10px] uppercase tracking-[0.2em]">Cashfree App ID (Public)</Label>
                                <Input value={publicApiKey} onChange={e => setPublicApiKey(e.target.value)} className="rounded-xl h-12 bg-background border-none font-mono text-orange-500 shadow-inner" placeholder="Enter Cashfree App ID..." />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Note: API method requires matching backend credentials in the .env file.</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2 max-w-xs">
                    <Label className="font-black text-primary text-[10px] uppercase tracking-[0.2em]">Expert Verification Fee (₱)</Label>
                    <Input type="number" value={verificationFee} onChange={e => setVerificationFee(Number(e.target.value))} className="rounded-xl h-12 bg-background border-none font-black text-white text-xl shadow-inner" />
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-6">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full h-14 rounded-2xl font-black text-lg bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95">
                    {isSaving ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Save className="mr-2 h-5 w-5" />} 
                    Save & Publish Settings
                </Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none rounded-2xl overflow-hidden bg-card">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <Layout className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-xl font-black uppercase italic">Homepage Modules</CardTitle>
                        </div>
                        <CardDescription className="text-muted-foreground">Manage the visibility of core sections.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max Carousel Professionals</Label>
                            <Input type="number" value={featuredLimit} onChange={e => setFeaturedLimit(Number(e.target.value))} className="h-12 bg-background border-none rounded-xl font-black text-xl text-white" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 shadow-inner">
                            <div>
                                <Label className="text-base font-black uppercase italic">Recent Grid</Label>
                                <p className="text-xs text-muted-foreground font-medium">Toggle the 'Recent Professionals' section.</p>
                            </div>
                            <Switch checked={isRecentProfessionalsEnabled} onCheckedChange={setIsRecentProfessionalsEnabled} className="data-[state=checked]:bg-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none rounded-2xl overflow-hidden bg-card">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <Gift className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-xl font-black uppercase italic">Growth Engine</CardTitle>
                        </div>
                        <CardDescription className="text-muted-foreground">Configure referral rewards and incentives.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Points per Successful Join</Label>
                            <Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} className="h-12 bg-background border-none rounded-xl font-black text-xl text-white" />
                            <p className="text-[9px] text-muted-foreground italic">This is the amount of 'Premium Credits' awarded to the referrer when a new user signs up with their code.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none rounded-2xl overflow-hidden bg-card">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <Megaphone className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-xl font-black uppercase italic">Announcements</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="font-bold">Enable Banner</Label>
                            <Switch checked={announcementEnabled} onCheckedChange={setAnnouncementEnabled} className="data-[state=checked]:bg-orange-500" />
                        </div>
                        <Textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="bg-background border-none rounded-xl min-h-[80px]" placeholder="Breaking news text here..." />
                    </CardContent>
                </Card>

                <Card className="border-none rounded-2xl overflow-hidden bg-card">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <Video className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-xl font-black uppercase italic">Video Resources</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Introduction Video URL</Label>
                            <Input value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} className="h-12 bg-background border-none rounded-xl font-mono text-xs" placeholder="YouTube URL or Storage Path" />
                            <p className="text-[9px] text-muted-foreground italic">Update the video shown on the Guides page.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none rounded-2xl overflow-hidden bg-card">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <Phone className="h-6 w-6 text-orange-500" />
                            <CardTitle className="text-xl font-black uppercase italic">Central Support</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Support Phone</Label>
                        <Input value={centralContactPhone} onChange={(e) => setCentralContactPhone(e.target.value)} className="h-12 bg-background border-none rounded-xl font-black text-2xl text-white" placeholder="+91..." />
                    </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6"><CardTitle className="font-black uppercase italic">CSV Actions</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col gap-3">
                            <input type="file" accept=".csv" className="hidden" id="csv-import-input" onChange={handleImportCSV} />
                            <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10" onClick={() => document.getElementById('csv-import-input')?.click()} disabled={isImporting}>
                                {isImporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Select CSV to Import
                            </Button>
                            <Button className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black" onClick={handleExportCSV}>
                                <Download className="mr-2 h-4 w-4" /> Export Registry (Excel/CSV)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6"><CardTitle className="font-black uppercase italic">System Backup</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black" onClick={handleExportJSON} disabled={isExporting}>
                            {isExporting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <HardDriveDownload className="mr-2 h-4 w-4" />} Full Data Backup (JSON)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="bg-white/5 border-b border-white/5 pb-6"><CardTitle className="font-black uppercase italic">Manual User Provisioning</CardTitle></CardHeader>
              <CardContent className="p-6"><CreateUserForm onSuccess={() => toast({ title: "User created" })} /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-background text-white shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black uppercase italic">Modify Expert Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isVacancyDialogOpen} onOpenChange={setIsVacancyDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-background text-white shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black uppercase italic">{selectedVacancy ? 'Edit Vacancy' : 'Post Admin Opening'}</DialogTitle>
          </DialogHeader>
          <PostVacancyForm isAdmin vacancy={selectedVacancy || undefined} onSuccess={() => setIsVacancyDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none bg-background text-white p-8">
          <DialogHeader className="items-center text-center">
            <div className="p-4 bg-orange-500/10 rounded-full w-fit mx-auto mb-4"><PlusCircle className="h-10 w-10 text-orange-500" /></div>
            <DialogTitle className="text-3xl font-black uppercase italic">Award Credits</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium pt-2">Manually grant referral points to {selectedUser?.firstName} {selectedUser?.lastName}.</DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Amount to Grant</Label>
                <Input type="number" value={awardPoints} onChange={(e) => setAwardPoints(Number(e.target.value))} className="rounded-xl h-14 bg-white/5 border-none font-black text-orange-500 text-2xl text-center shadow-inner" />
          </div>
          <div className="flex flex-col gap-3"><Button onClick={handleAwardPoints} className="w-full h-12 rounded-xl font-black bg-orange-500 hover:bg-orange-600">Apply Reward</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isPostDeleteDialogOpen} onOpenChange={setIsPostDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none bg-background text-white">
          <AlertDialogHeader className="items-center text-center">
            <div className="p-4 bg-red-500/10 rounded-full w-fit mb-4"><Activity className="h-10 w-10 text-red-500" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase italic">Remove Update?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">This professional update will be permanently deleted from the public feed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col pt-4">
            <AlertDialogAction onClick={handleDeletePost} className="w-full h-12 bg-red-500 hover:bg-red-600 font-black rounded-xl border-none">Confirm Removal</AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 bg-transparent border-white/10 hover:bg-white/5 rounded-xl font-bold">Discard Action</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none bg-background text-white">
          <AlertDialogHeader className="items-center text-center">
            <div className="p-4 bg-red-500/10 rounded-full w-fit mb-4"><UserX className="h-10 w-10 text-red-500" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase italic">Purge User Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">Irreversible removal of all profile data, history, and login access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col pt-4">
            <AlertDialogAction onClick={handleDeleteUser} className="w-full h-12 bg-red-500 hover:bg-red-600 font-black rounded-xl border-none">Permanently Delete</AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 bg-transparent border-white/10 hover:bg-white/5 rounded-xl font-bold">Discard Action</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
