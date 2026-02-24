'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, getDocs, where, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, Search, PlusCircle, Mail, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown, Rss, UserPlus, Fingerprint, Award, CircleHelp, CheckCircle, FileJson, MapPin, Clock, AlertCircle, CreditCard, Fingerprint as IdIcon, Check, XCircle, Youtube, Video, ChevronLeft, ChevronRight, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreateUserForm } from '@/components/auth/create-user-form';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { exportAllData } from '@/ai/flows/export-data-flow';
import { importUsers } from '@/ai/flows/import-users-flow';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Cell,
  LineChart,
  Line
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
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    referralCode?: string;
    referralPoints?: number;
    referredByCode?: string | null;
    createdAt?: Timestamp;
    profession?: string;
    phoneNumber?: string;
    companyName?: string;
    following?: string[];
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

type AppConfig = {
    introVideoUrl?: string;
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
    premierPlanPrices?: { daily: number; monthly: number; yearly: number };
    superPremierPlanPrices?: { daily: number; monthly: number; yearly: number };
};

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVacancyDialogOpen, setIsVacancyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [awardPoints, setAwardPoints] = useState(100);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified' | 'premier' | 'super'>('all');

  // Pagination State
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // App Config State
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [featuredLimit, setFeaturedLimit] = useState(3);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementSpeed, setAnnouncementSpeed] = useState(20);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'API' | 'Link'>('API');
  const [publicApiKey, setPublicApiKey] = useState("");
  const [referralPoints, setReferralPoints] = useState(100);
  const [homepageCategories, setHomepageCategories] = useState<HomepageCategory[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  const usersQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersQuery);

  const paymentsQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'payments'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsQuery);

  const vacanciesQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: vacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(vacanciesQuery);

  const postsQuery = useMemoFirebase(() => isSuperAdmin ? collection(firestore, 'posts') : null, [firestore, isSuperAdmin]);
  const { data: posts } = useCollection(postsQuery);

  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

  useEffect(() => {
    if (appConfig) {
      setIntroVideoUrl(appConfig.introVideoUrl || "");
      setFeaturedLimit(appConfig.featuredExpertsLimit || 3);
      setAnnouncementText(appConfig.announcementText || "");
      setAnnouncementEnabled(appConfig.isAnnouncementEnabled || false);
      setAnnouncementSpeed(appConfig.announcementSpeed || 20);
      setPaymentsEnabled(appConfig.isPaymentsEnabled !== false);
      setPaymentMethod(appConfig.paymentMethod || 'API');
      setPublicApiKey(appConfig.publicApiKey || "");
      setReferralPoints(appConfig.referralRewardPoints || 100);
      setHomepageCategories(appConfig.homepageCategories || []);
      setDepartments(appConfig.departments || []);
    }
  }, [appConfig]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchQuery, userFilter]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, verified: 0, unverified: 0, premier: 0, super: 0, referrals: 0 };
    return {
        total: users.length,
        verified: users.filter(u => u.verified).length,
        unverified: users.filter(u => !u.verified).length,
        premier: users.filter(u => u.tier === 'Premier').length,
        super: users.filter(u => u.tier === 'Super Premier').length,
        referrals: users.filter(u => u.referredByCode).length,
    };
  }, [users]);

  // Report Calculations
  const reportData = useMemo(() => {
    if (!users || !payments || !posts) return null;

    // 1. Revenue Metrics
    const successfulPayments = payments.filter(p => p.status === 'successful');
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const revenueByPlan = [
        { name: 'Premier', value: successfulPayments.filter(p => p.plan === 'Premier').reduce((sum, p) => sum + p.amount, 0), color: '#9333ea' },
        { name: 'Super Premier', value: successfulPayments.filter(p => p.plan === 'Super Premier').reduce((sum, p) => sum + p.amount, 0), color: '#2563eb' },
        { name: 'Verification', value: successfulPayments.filter(p => p.plan === 'Verification').reduce((sum, p) => sum + p.amount, 0), color: '#16a34a' },
    ];

    // 2. User Growth (Last 6 Months)
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

    // 3. Expert Distribution
    const roleDistribution = [
        { name: 'Freelancer', count: users.filter(u => u.role === 'Freelancer').length },
        { name: 'Company', count: users.filter(u => u.role === 'Company').length },
        { name: 'Auth Pro', count: users.filter(u => u.role === 'Authorized Pro').length },
    ];

    // 4. Referrals Leaderboard
    const referrers = users
        .filter(u => u.referralPoints && u.referralPoints > 0)
        .sort((a, b) => (b.referralPoints || 0) - (a.referralPoints || 0))
        .slice(0, 5);

    // 5. Community Activity
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

    return {
        totalRevenue,
        revenueByPlan,
        userGrowth,
        roleDistribution,
        referrers,
        totalPosts: posts.length,
        totalLikes
    };
  }, [users, payments, posts]);

  const referralUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (users) {
        users.forEach(u => {
            if (u.referredByCode) {
                map[u.referredByCode] = (map[u.referredByCode] || 0) + 1;
            }
        });
    }
    return map;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
        const matchesSearch = 
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            u.referralCode?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
        
        const matchesFilter = 
            userFilter === 'all' ? true :
            userFilter === 'verified' ? u.verified :
            userFilter === 'unverified' ? !u.verified :
            userFilter === 'premier' ? u.tier === 'Premier' :
            userFilter === 'super' ? u.tier === 'Super Premier' : true;

        return matchesSearch && matchesFilter;
    });
  }, [users, userSearchQuery, userFilter]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(appConfigDocRef!, {
        introVideoUrl,
        featuredExpertsLimit: featuredLimit,
        announcementText,
        isAnnouncementEnabled: announcementEnabled,
        announcementSpeed,
        isPaymentsEnabled: paymentsEnabled,
        paymentMethod,
        publicApiKey,
        referralRewardPoints: referralPoints,
        homepageCategories,
        departments,
      }, { merge: true });
      toast({ title: "Settings Saved" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const userRef = doc(firestore, 'users', userId);
    const adminRef = doc(firestore, 'roles_super_admin', userId);
    const managerRef = doc(firestore, 'roles_manager', userId);
    try {
      await updateDocumentNonBlocking(userRef, { role: newRole });
      if (newRole === 'Super Admin') await setDocumentNonBlocking(adminRef, { uid: userId });
      else await deleteDoc(adminRef);
      if (newRole === 'Manager') await setDocumentNonBlocking(managerRef, { uid: userId });
      else await deleteDoc(managerRef);
      toast({ title: "Role Updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
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

  const handleAwardPoints = async () => {
    if (!selectedUser) return;
    try {
        const userRef = doc(firestore, 'users', selectedUser.id);
        await updateDocumentNonBlocking(userRef, { referralPoints: increment(awardPoints) });
        toast({ title: "Points Awarded", description: `Successfully awarded ${awardPoints} points to ${selectedUser.firstName}` });
        setIsAwardDialogOpen(false);
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleToggleVacancyVerified = async (vacancyId: string, currentStatus: boolean) => {
    const vacancyRef = doc(firestore, 'vacancies', vacancyId);
    try {
        await updateDocumentNonBlocking(vacancyRef, { isCompanyVerified: !currentStatus });
        toast({ title: "Verification Toggled" });
    } catch (e) {
        toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleToggleVacancyTier = async (vacancyId: string, currentTier?: string) => {
    const vacancyRef = doc(firestore, 'vacancies', vacancyId);
    try {
        const nextTier = currentTier === 'Premier' ? 'Standard' : 'Premier';
        await updateDocumentNonBlocking(vacancyRef, { companyTier: nextTier });
        toast({ title: "Tier Toggled" });
    } catch (e) {
        toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleUpdateVacancyStatus = async (vacancyId: string, newStatus: 'Pending' | 'Approved' | 'Rejected') => {
    const vacancyRef = doc(firestore, 'vacancies', vacancyId);
    try {
        await updateDocumentNonBlocking(vacancyRef, { status: newStatus });
        toast({ title: "Status Updated", description: `Vacancy is now ${newStatus}` });
    } catch (e) {
        toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleDeleteVacancy = async (vacancyId: string) => {
    const vacancyRef = doc(firestore, 'vacancies', vacancyId);
    try {
        await deleteDocumentNonBlocking(vacancyRef);
        toast({ title: "Vacancy Deleted" });
    } catch (e) {
        toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

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
    const headers = ["ID", "First Name", "Last Name", "Email", "Role", "Tier", "Verified", "Referral Code", "Points"];
    const rows = users.map(u => [
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.tier || 'Standard',
        u.verified ? 'Yes' : 'No',
        u.referralCode || '',
        u.referralPoints || 0
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `experts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    toast({ title: "CSV Exported" });
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
            if (result.errors.length > 0) {
                console.error("Import Errors:", result.errors);
                toast({ variant: "destructive", title: "Errors during import", description: "Check console for details." });
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Import Failed", description: "Invalid CSV format or network error." });
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
  };

  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newDepName, setNewDepName] = useState("");

  const addCategory = () => {
    if (!newCatName || !newCatIcon) return;
    setHomepageCategories([...homepageCategories, { id: Date.now().toString(), name: newCatName, icon: newCatIcon }]);
    setNewCatName("");
    setNewCatIcon("");
  };

  const deleteCategory = (id: string) => {
    setHomepageCategories(homepageCategories.filter(c => c.id !== id));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCats = [...homepageCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    setHomepageCategories(newCats);
  };

  const addDepartment = () => {
    if (!newDepName) return;
    if (departments.includes(newDepName)) {
        toast({ variant: "destructive", title: "Already exists" });
        return;
    }
    setDepartments([...departments, newDepName]);
    setNewDepName("");
  };

  const deleteDepartment = (name: string) => {
    setDepartments(departments.filter(d => d !== name));
  };

  if (isUserLoading || isRoleLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  if (!isSuperAdmin) return <div className="flex h-screen items-center justify-center">Access Denied.</div>;

  return (
    <div className="min-h-screen bg-background text-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-xl">
                <Shield className="h-10 w-10 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Super Admin</h1>
              <p className="text-muted-foreground text-sm font-medium">Welcome, {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl border-2 bg-transparent text-white hover:bg-white/10" onClick={() => auth && signOut(auth).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 h-12 rounded-xl mb-8">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-white font-bold">Management</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-white font-bold">Analytics & Reports</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-white font-bold">Platform Settings</TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-white font-bold">Data Control</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 space-y-8">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Total Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.total}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Verified</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-green-500">{stats.verified}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Unverified</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-red-500">{stats.unverified}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Premier</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-purple-500">{stats.premier}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Super</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-blue-500">{stats.super}</div></CardContent></Card>
              <Card className="border-none bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Referrals</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-orange-500">{stats.referrals}</div></CardContent></Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="flex w-full bg-secondary p-1 rounded-xl mb-6">
                    <TabsTrigger value="users" className="flex-1 rounded-lg font-bold" onClick={() => setCurrentPage(1)}>User Management</TabsTrigger>
                    <TabsTrigger value="vacancies" className="flex-1 rounded-lg font-bold">Vacancy Management</TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 rounded-lg font-bold">Payment Management</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black">Expert Users</CardTitle>
                                    <CardDescription className="text-muted-foreground">Manage all registered users in the system.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col lg:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search experts..." 
                                        className="pl-10 h-12 bg-white/5 border-none rounded-xl text-white placeholder:text-muted-foreground"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                                    <Button variant={userFilter === 'verified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'verified' ? 'all' : 'verified')}>Verified</Button>
                                    <Button variant={userFilter === 'unverified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'unverified' ? 'all' : 'unverified')}>Unverified</Button>
                                    <Button variant={userFilter === 'premier' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'premier' ? 'all' : 'premier')}>Premier</Button>
                                    <Button variant={userFilter === 'super' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'super' ? 'all' : 'super')}>Super Premier</Button>
                                </div>
                            </div>

                            <Tabs defaultValue="all" className="w-full">
                                <TabsList className="grid grid-cols-4 bg-background p-1 rounded-xl mb-4">
                                    <TabsTrigger value="all" className="rounded-lg font-bold" onClick={() => setCurrentPage(1)}>All</TabsTrigger>
                                    <TabsTrigger value="freelancer" className="rounded-lg font-bold" onClick={() => setCurrentPage(1)}>Freelancers</TabsTrigger>
                                    <TabsTrigger value="company" className="rounded-lg font-bold" onClick={() => setCurrentPage(1)}>Companies</TabsTrigger>
                                    <TabsTrigger value="pro" className="rounded-lg font-bold" onClick={() => setCurrentPage(1)}>Authorized Pros</TabsTrigger>
                                </TabsList>

                                {['all', 'freelancer', 'company', 'pro'].map((roleTab) => (
                                    <TabsContent key={roleTab} value={roleTab}>
                                        <div className="rounded-xl border border-white/5 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-white/5">
                                                    <TableRow className="border-white/5">
                                                        <TableHead className="w-[60px] font-bold text-white text-center">S.No</TableHead>
                                                        <TableHead className="font-bold text-white">Expert</TableHead>
                                                        <TableHead className="font-bold text-white">Rewards</TableHead>
                                                        <TableHead className="font-bold text-white">Role</TableHead>
                                                        <TableHead className="font-bold text-center text-white">Tier</TableHead>
                                                        <TableHead className="font-bold text-center text-white">Verification</TableHead>
                                                        <TableHead className="text-right font-bold text-white"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(() => {
                                                        const tabUsers = filteredUsers.filter(u => roleTab === 'all' || u.role.toLowerCase().includes(roleTab));
                                                        const totalItems = tabUsers.length;
                                                        const paginated = tabUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                                                        
                                                        if (paginated.length === 0 && !isUsersLoading) {
                                                            return (
                                                                <TableRow>
                                                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No experts found.</TableCell>
                                                                </TableRow>
                                                            );
                                                        }

                                                        return paginated.map((u, index) => {
                                                            const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                                            return (
                                                                <TableRow key={u.id} className="hover:bg-white/5 border-white/5 h-20">
                                                                    <TableCell className="text-center font-bold text-muted-foreground text-xs">{globalIndex}</TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-3">
                                                                            <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                                                                                <AvatarImage src={u.photoUrl} />
                                                                                <AvatarFallback className="bg-orange-500/10 text-orange-500 font-bold">{u.firstName[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="space-y-0.5">
                                                                                <div className="font-bold text-sm text-white">{u.firstName} {u.lastName}</div>
                                                                                <div className="text-[10px] text-muted-foreground">{u.email}</div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-bold text-orange-500">{u.referralPoints || 0} pts</span>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { setSelectedUser(u); setIsAwardDialogOpen(true); }}><Award className="h-3 w-3" /></Button>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">{u.role}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {u.tier === 'Super Premier' ? <Sparkles className="h-4 w-4 text-blue-500 mx-auto" /> : u.tier === 'Premier' ? <Crown className="h-4 w-4 text-purple-500 mx-auto" /> : <UserIcon className="h-4 w-4 text-muted-foreground mx-auto" />}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center justify-center">
                                                                            <Switch checked={u.verified} onCheckedChange={(v) => updateDocumentNonBlocking(doc(firestore, 'users', u.id), { verified: v })} className="scale-75" />
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="bg-card text-white border-white/10">
                                                                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                                                                                <DropdownMenuSeparator className="bg-white/5" />
                                                                                <DropdownMenuItem className="text-red-500" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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

                                        <div className="flex items-center justify-between pt-6">
                                            <p className="text-xs text-muted-foreground">Page {currentPage}</p>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="rounded-xl"><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
                                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(filteredUsers.filter(u => roleTab === 'all' || u.role.toLowerCase().includes(roleTab)).length / ITEMS_PER_PAGE)} className="rounded-xl">Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vacancies">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-6 w-6 text-orange-500" />
                                    <div>
                                        <CardTitle className="text-2xl font-black">Vacancy Management</CardTitle>
                                        <CardDescription className="text-muted-foreground">Curation of job listings across the platform.</CardDescription>
                                    </div>
                                </div>
                                <Button onClick={() => { setSelectedVacancy(null); setIsVacancyDialogOpen(true); }} className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600"><PlusCircle className="mr-2 h-4 w-4" /> New Vacancy</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="font-bold text-white">Role</TableHead>
                                            <TableHead className="font-bold text-white">Company</TableHead>
                                            <TableHead className="font-bold text-white">Location</TableHead>
                                            <TableHead className="font-bold text-center text-white">Type</TableHead>
                                            <TableHead className="text-right font-bold text-white"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isVacanciesLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader className="animate-spin mx-auto" /></TableCell></TableRow>
                                        ) : vacancies?.map(v => (
                                            <TableRow key={v.id} className="hover:bg-white/5 border-white/5 h-16">
                                                <TableCell className="font-bold text-white">{v.title}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{v.companyName}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{v.location}</TableCell>
                                                <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{v.employmentType}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedVacancy(v); setIsVacancyDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteVacancy(v.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card className="border-none bg-card rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black">Transaction Logs</CardTitle>
                                    <CardDescription className="text-muted-foreground">Monitor revenue and payment statuses.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="font-bold text-white">Expert ID</TableHead>
                                            <TableHead className="font-bold text-white">Plan</TableHead>
                                            <TableHead className="font-bold text-center text-white">Amount</TableHead>
                                            <TableHead className="font-bold text-center text-white">Status</TableHead>
                                            <TableHead className="font-bold text-white">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isPaymentsLoading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader className="animate-spin mx-auto" /></TableCell></TableRow>
                                        ) : payments?.map(p => (
                                            <TableRow key={p.id} className="hover:bg-white/5 border-white/5 h-16">
                                                <TableCell className="font-mono text-[10px] opacity-50">{p.userId}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-[10px]">{p.plan}</Badge></TableCell>
                                                <TableCell className="text-center font-bold text-orange-500">₹{p.amount}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={cn("text-[9px] font-black uppercase", p.status === 'successful' ? "bg-green-500" : "bg-red-500")}>{p.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground">{p.createdAt ? format(p.createdAt.toDate(), 'PP p') : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="reports" className="mt-0 space-y-8">
            {/* KPI Section */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none bg-card shadow-lg">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-green-500" /> Total Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-orange-500">₹{reportData?.totalRevenue.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground font-medium">All-time earnings from subscriptions.</p>
                    </CardContent>
                </Card>
                <Card className="border-none bg-card shadow-lg">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Activity className="h-3 w-3 text-blue-500" /> Verification Rate
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-white">
                            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground font-medium">Percentage of safely audited experts.</p>
                    </CardContent>
                </Card>
                <Card className="border-none bg-card shadow-lg">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-3 w-3 text-purple-500" /> Premium Adoption
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-white">
                            {stats.total > 0 ? Math.round(((stats.premier + stats.super) / stats.total) * 100) : 0}%
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground font-medium">Users opted for high-visibility plans.</p>
                    </CardContent>
                </Card>
                <Card className="border-none bg-card shadow-lg">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="h-3 w-3 text-orange-500" /> Community Score
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-white">{reportData?.totalLikes || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground font-medium">Total hearts given across the feed.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-orange-500" /> Expert Growth Trend
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest">New experts joined in last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData?.userGrowth}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8a92a6', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#8a92a6', fontSize: 12}} />
                                <Tooltip contentStyle={{backgroundColor: '#24262d', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff'}} cursor={{fill: '#ffffff05'}} />
                                <Bar dataKey="users" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-orange-500" /> Revenue Distribution
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Income split by subscription plan</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 h-[300px] flex items-center">
                        <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie data={reportData?.revenueByPlan} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                        {reportData?.revenueByPlan.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#24262d', border: 'none', borderRadius: '12px', fontSize: '12px'}} />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-4">
                            {reportData?.revenueByPlan.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full" style={{backgroundColor: item.color}} />
                                        <span className="text-xs font-bold text-muted-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-white">₹{item.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Role Distribution */}
                <Card className="lg:col-span-1 border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-xl font-black">Expert Types</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {reportData?.roleDistribution.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span className="text-white">{item.count}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{width: `${(item.count / stats.total) * 100}%`}} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Referral Leaderboard */}
                <Card className="lg:col-span-2 border-none bg-card rounded-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <Award className="h-5 w-5 text-orange-500" /> Referral Leaderboard
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Top members driving new signups</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Expert</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-center">Referral ID</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-center">Referrals</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-right">Points Earned</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData?.referrers.map((ref, idx) => (
                                    <TableRow key={ref.id} className="border-white/5 hover:bg-white/5">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs font-black opacity-30 w-4">{idx + 1}</div>
                                                <div className="font-bold text-sm">{ref.firstName} {ref.lastName}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs text-orange-500">{ref.referralCode}</TableCell>
                                        <TableCell className="text-center font-bold">{referralUsageMap[ref.referralCode || ''] || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="bg-orange-500/10 text-orange-500 border-none font-black">{ref.referralPoints || 0} PTS</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-6">
            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Video className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Content Management</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Manage dynamic content like introduction videos.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label className="font-bold text-white/70 text-xs uppercase tracking-widest">Introduction Video URL (YouTube)</Label>
                    <div className="relative">
                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                        <Input value={introVideoUrl} onChange={e => setIntroVideoUrl(e.target.value)} className="rounded-xl h-12 bg-background border-none pl-10 text-white placeholder:text-muted-foreground" placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                    <p className="text-[10px] text-muted-foreground">This video will be featured at the top of the Guides page.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Key className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Manage API Keys</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Manage public-facing API keys and view instructions for secret keys.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label className="font-bold text-white/70 text-xs uppercase tracking-widest">Public API Key / App ID (e.g., Cashfree)</Label>
                    <Input value={publicApiKey} onChange={e => setPublicApiKey(e.target.value)} className="rounded-xl h-12 bg-background border-none font-mono text-orange-500" placeholder="Enter public API key..." />
                    <p className="text-[10px] text-muted-foreground">This key will be used for client-side operations where needed.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Manage Payment Method</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Globally enable or disable payments and choose the method for expert activation.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5">
                    <div>
                        <Label className="text-base font-bold text-white">Payments Enabled</Label>
                        <p className="text-xs text-muted-foreground">Turn all payment functionalities on or off.</p>
                    </div>
                    <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} className="data-[state=checked]:bg-orange-500" />
                </div>
                <div className="space-y-3">
                    <Label className="font-bold text-white/70 text-xs uppercase tracking-widest">Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(v: 'API' | 'Link') => setPaymentMethod(v)} className="flex flex-col gap-2">
                        <div className="flex items-center space-x-3">
                            <RadioGroupItem value="API" id="method-api" className="border-orange-500 text-orange-500" />
                            <Label htmlFor="method-api" className="font-bold text-sm text-orange-500">API (Cashfree Popup)</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <RadioGroupItem value="Link" id="method-link" className="border-white/20" />
                            <Label htmlFor="method-link" className="font-bold text-sm text-white/70">Payment Link</Label>
                        </div>
                    </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Gift className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Referral Settings</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Configure points for successful referrals.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label className="font-bold text-white/70 text-xs uppercase tracking-widest">Points Awarded per Referral</Label>
                    <Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} className="rounded-xl h-12 bg-background border-none font-black text-orange-500 text-xl" />
                    <p className="text-[10px] text-muted-foreground">Set the number of points awarded to a user for each successful referral.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Global Settings</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Control content, pricing, and payment links.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <List className="h-5 w-5 text-orange-500" />
                        <h4 className="font-black text-white">Homepage Categories</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Manage and reorder the categories displayed on the homepage.</p>
                    <div className="space-y-2">
                        {homepageCategories.map((cat, idx) => (
                            <div key={cat.id} className="flex items-center gap-2">
                                <Input value={cat.name} onChange={e => {
                                    const newCats = [...homepageCategories];
                                    newCats[idx].name = e.target.value;
                                    setHomepageCategories(newCats);
                                }} className="bg-background border-none text-white h-10" />
                                <Input value={cat.icon} onChange={e => {
                                    const newCats = [...homepageCategories];
                                    newCats[idx].icon = e.target.value;
                                    setHomepageCategories(newCats);
                                }} className="bg-background border-none text-white h-10 w-32" />
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-white/5" onClick={() => moveCategory(idx, 'up')} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-white/5" onClick={() => moveCategory(idx, 'down')} disabled={idx === homepageCategories.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => deleteCategory(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        ))}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Input placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="bg-background border-dashed border-white/20 h-10 text-white" />
                            <Input placeholder="Icon Name" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="bg-background border-dashed border-white/20 h-10 text-white" />
                            <Button onClick={addCategory} className="bg-orange-500 hover:bg-orange-600 h-10 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                        </div>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-orange-500" />
                        <h4 className="font-black text-white">Department Management</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Create and manage company departments.</p>
                    <div className="space-y-2">
                        {departments.map((dep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-background border border-white/5 rounded-lg">
                                <span className="font-bold text-sm px-2 text-white/80">{dep}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => deleteDepartment(dep)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <Input placeholder="New Department Name" value={newDepName} onChange={e => setNewDepName(e.target.value)} className="bg-background border-dashed border-white/20 h-10 text-white" />
                            <Button onClick={addDepartment} className="bg-orange-500 hover:bg-orange-600 h-10 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-6 border-t border-white/5">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full h-12 rounded-xl font-black text-lg bg-orange-500 hover:bg-orange-600">
                    {isSaving ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Save className="mr-2 h-5 w-5" />} 
                    Save All Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-0 space-y-6">
            <Card className="border-none bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-orange-500" />
                    <div>
                        <CardTitle className="text-2xl font-black text-white">Expert User Management</CardTitle>
                        <CardDescription className="text-muted-foreground">Bulk create, update, or export expert users.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="font-bold text-white">Import Users from CSV</h4>
                            <p className="text-xs text-muted-foreground">Upload a CSV file to bulk create or update users. Matches based on &apos;id&apos; or &apos;email&apos;.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="csv-import-input"
                                onChange={handleImportCSV}
                            />
                            <Button 
                                variant="outline" 
                                className="w-full h-12 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
                                onClick={() => document.getElementById('csv-import-input')?.click()}
                                disabled={isImporting}
                            >
                                {isImporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Select CSV to Import
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="font-bold text-white">Export Users to Excel (CSV)</h4>
                            <p className="text-xs text-muted-foreground">Download a CSV file of all expert users. This can be opened in Excel or used as a template.</p>
                        </div>
                        <Button 
                            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold"
                            onClick={handleExportCSV}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export Users (CSV)
                        </Button>
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <HardDriveDownload className="h-6 w-6 text-orange-500" />
                    <div>
                        <CardTitle className="text-2xl font-black text-white">Full Application Backup</CardTitle>
                        <CardDescription className="text-muted-foreground">Export all application data (users, vacancies, etc.) as a single JSON file.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Button 
                    className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold"
                    onClick={handleExportJSON}
                    disabled={isExporting}
                >
                    {isExporting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />} 
                    Export All Data (JSON)
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <UserPlus className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Manual User Provisioning</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <CreateUserForm onSuccess={() => toast({ title: "User created" })} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border-none bg-background text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black">Edit Expert Profile</DialogTitle></DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isVacancyDialogOpen} onOpenChange={setIsVacancyDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border-none bg-background text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black">{selectedVacancy ? 'Edit Job Opening' : 'Post New Job'}</DialogTitle></DialogHeader>
          <PostVacancyForm isAdmin vacancy={selectedVacancy || undefined} onSuccess={() => setIsVacancyDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
        <DialogContent className="rounded-2xl border-none bg-background text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Award Referral Points</DialogTitle>
            <DialogDescription className="text-muted-foreground">
                Manually grant extra referral points to {selectedUser?.firstName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label className="font-bold text-white/70 text-xs uppercase tracking-widest">Points Amount</Label>
                <Input 
                    type="number" 
                    value={awardPoints} 
                    onChange={(e) => setAwardPoints(Number(e.target.value))}
                    className="rounded-xl h-12 bg-white/5 border-none font-black text-orange-500 text-xl"
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAwardDialogOpen(false)} className="rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleAwardPoints} className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600">Grant Reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none bg-background text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-white">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
                This action is permanent and will remove this expert's profile, post history, and authentication credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">Permanently Delete User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  async function handleDeleteUser() {
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
}
