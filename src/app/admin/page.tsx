'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, getDocs, where, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, Search, PlusCircle, Mail, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, CreditCard, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown, Rss, UserPlus, Fingerprint, Award, CircleHelp, CheckCircle, FileJson, MapPin, Clock, AlertCircle } from 'lucide-react';
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
import { format, formatDistanceToNow } from 'date-fns';
import { exportAllData } from '@/ai/flows/export-data-flow';
import { importUsers } from '@/ai/flows/import-users-flow';
import { Slider } from '@/components/ui/slider';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import type { Vacancy } from '@/app/vacancies/page';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [awardPoints, setAwardPoints] = useState(100);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified' | 'premier' | 'super'>('all');

  // Vacancy Management State
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [isVacancyFormOpen, setIsVacancyFormOpen] = useState(false);
  const [isVacancyDeleteDialogOpen, setIsVacancyDeleteDialogOpen] = useState(false);

  // App Config State
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

  // Category and Department form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newDepName, setNewDepName] = useState("");

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  const usersQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersQuery);

  const vacanciesQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: vacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(vacanciesQuery);

  const paymentsQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'payments'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsQuery);

  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

  useEffect(() => {
    if (appConfig) {
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
            u.referralCode?.toLowerCase().includes(userSearchQuery.toLowerCase());
        
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

  // Category & Department helper functions
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

  const handleDeleteVacancy = async () => {
    if (!selectedVacancy) return;
    try {
        await deleteDocumentNonBlocking(doc(firestore, 'vacancies', selectedVacancy.id));
        toast({ title: "Vacancy Deleted" });
    } catch (e) {
        toast({ variant: "destructive", title: "Delete Failed" });
    } finally {
        setIsVacancyDeleteDialogOpen(false);
        setSelectedVacancy(null);
    }
  };

  const handleToggleVacancyVerified = async (vacancy: Vacancy) => {
    try {
        await updateDocumentNonBlocking(doc(firestore, 'vacancies', vacancy.id), {
            isCompanyVerified: !vacancy.isCompanyVerified
        });
        toast({ title: `Company ${!vacancy.isCompanyVerified ? 'Verified' : 'Unverified'}` });
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleToggleVacancyPremier = async (vacancy: Vacancy) => {
    const newTier = vacancy.companyTier === 'Premier' ? 'Standard' : 'Premier';
    try {
        await updateDocumentNonBlocking(doc(firestore, 'vacancies', vacancy.id), {
            companyTier: newTier
        });
        toast({ title: `Tier set to ${newTier}` });
    } catch (e) {
        toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  if (isUserLoading || isRoleLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  if (!isSuperAdmin) return <div className="flex h-screen items-center justify-center">Access Denied.</div>;

  return (
    <div className="min-h-screen bg-[#1a1c23] text-white p-4 sm:p-8">
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
          <TabsList className="grid w-full grid-cols-3 bg-[#24262d] p-1 h-12 rounded-xl mb-8">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white">Dashboard</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white">Settings</TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white">Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Total Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.total}</div><p className="text-[10px] text-muted-foreground mt-1">Total registered users</p></CardContent></Card>
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Verified Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-green-500">{stats.verified}</div><p className="text-[10px] text-muted-foreground mt-1">Total verified experts</p></CardContent></Card>
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Unverified Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-red-500">{stats.unverified}</div><p className="text-[10px] text-muted-foreground mt-1">Pending verification</p></CardContent></Card>
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Premier Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-purple-500">{stats.premier}</div><p className="text-[10px] text-muted-foreground mt-1">Total Premier experts</p></CardContent></Card>
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Super Premier</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-blue-500">{stats.super}</div><p className="text-[10px] text-muted-foreground mt-1">Total Super Premier</p></CardContent></Card>
              <Card className="border-none bg-[#24262d]"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Referrals Used</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-orange-500">{stats.referrals}</div><p className="text-[10px] text-muted-foreground mt-1">Total signups via referral</p></CardContent></Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="flex w-full bg-[#24262d] p-1 rounded-xl mb-6">
                    <TabsTrigger value="users" className="flex-1 rounded-lg font-bold">User Management</TabsTrigger>
                    <TabsTrigger value="vacancies" className="flex-1 rounded-lg font-bold">Vacancy Management</TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 rounded-lg font-bold">Payment Management</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
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
                            {/* Search and Quick Filters */}
                            <div className="flex flex-col lg:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search by name, email, or referral code..." 
                                        className="pl-10 h-12 bg-white/5 border-none rounded-xl text-white placeholder:text-muted-foreground"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                                    <Button variant={userFilter === 'verified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold bg-[#1a1c23] hover:bg-[#24262d]" onClick={() => setUserFilter(userFilter === 'verified' ? 'all' : 'verified')}>Verified</Button>
                                    <Button variant={userFilter === 'unverified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold bg-[#1a1c23] hover:bg-[#24262d]" onClick={() => setUserFilter(userFilter === 'unverified' ? 'all' : 'unverified')}>Unverified</Button>
                                    <Button variant={userFilter === 'premier' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold bg-[#1a1c23] hover:bg-[#24262d]" onClick={() => setUserFilter(userFilter === 'premier' ? 'all' : 'premier')}>Premier</Button>
                                    <Button variant={userFilter === 'super' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold bg-[#1a1c23] hover:bg-[#24262d]" onClick={() => setUserFilter(userFilter === 'super' ? 'all' : 'super')}>Super Premier</Button>
                                </div>
                            </div>

                            <Tabs defaultValue="all" className="w-full">
                                <TabsList className="grid grid-cols-4 bg-[#1a1c23] p-1 rounded-xl mb-4">
                                    <TabsTrigger value="all" className="rounded-lg font-bold">All Users</TabsTrigger>
                                    <TabsTrigger value="freelancer" className="rounded-lg font-bold">Freelancers</TabsTrigger>
                                    <TabsTrigger value="company" className="rounded-lg font-bold">Companies</TabsTrigger>
                                    <TabsTrigger value="pro" className="rounded-lg font-bold">Authorized Pros</TabsTrigger>
                                </TabsList>

                                {['all', 'freelancer', 'company', 'pro'].map((roleTab) => (
                                    <TabsContent key={roleTab} value={roleTab}>
                                        <div className="rounded-xl border border-white/5 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-white/5">
                                                    <TableRow className="border-white/5">
                                                        <TableHead className="font-bold text-white">Expert Details</TableHead>
                                                        <TableHead className="font-bold text-white">Rewards</TableHead>
                                                        <TableHead className="font-bold text-white">Role</TableHead>
                                                        <TableHead className="font-bold text-center text-white">Joined</TableHead>
                                                        <TableHead className="font-bold text-center text-white">Tier</TableHead>
                                                        <TableHead className="font-bold text-center text-white">Verification</TableHead>
                                                        <TableHead className="text-right font-bold text-white"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredUsers
                                                        .filter(u => roleTab === 'all' || u.role.toLowerCase().includes(roleTab))
                                                        .map(u => {
                                                            const usedCount = referralUsageMap[u.referralCode || ''] || 0;
                                                            return (
                                                                <TableRow key={u.id} className="hover:bg-white/5 transition-colors border-white/5">
                                                                    <TableCell>
                                                                        <div className="flex items-start gap-3">
                                                                            <Avatar className="h-12 w-12 border-2 border-white/10 shrink-0 mt-1">
                                                                                <AvatarImage src={u.photoUrl} />
                                                                                <AvatarFallback className="bg-orange-500/10 text-orange-500 font-bold">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="space-y-1">
                                                                                <div className="font-black text-sm text-white">{u.firstName} {u.lastName}</div>
                                                                                <div className="text-[10px] text-muted-foreground font-medium">{u.email}</div>
                                                                                {u.companyName && (
                                                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                        <Building className="h-3 w-3" /> {u.companyName}
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                    <Phone className="h-3 w-3" /> +91 {u.phoneNumber || 'N/A'}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded text-orange-500">
                                                                                        <Key className="h-2.5 w-2.5" /> {u.referralCode || '-'}
                                                                                    </div>
                                                                                    {u.referredByCode && (
                                                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded h-4 border-orange-500/20 bg-orange-500/5 text-orange-500">{u.referredByCode}</Badge>
                                                                                    )}
                                                                                    <Badge className={cn("text-[9px] px-1.5 py-0 rounded h-4 border-none", usedCount > 0 ? "bg-orange-500 text-white" : "bg-white/10 text-muted-foreground")}>Used: {usedCount}</Badge>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-xs font-bold text-orange-500">{u.referralPoints || 0}</div>
                                                                                <div className="text-[10px] font-medium opacity-70">Points</div>
                                                                            </div>
                                                                            <Button 
                                                                                variant="outline" 
                                                                                size="sm" 
                                                                                className="h-7 px-2 rounded-lg text-[10px] font-bold border-2 border-white/10 bg-transparent text-white hover:bg-white/5"
                                                                                onClick={() => { setSelectedUser(u); setIsAwardDialogOpen(true); }}
                                                                            >
                                                                                <Award className="mr-1 h-3 w-3" /> Award
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary" className="rounded-md font-bold text-[10px] uppercase tracking-wider h-6 bg-[#1a1c23] text-white border-none">{u.role}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <div className="text-[10px] font-medium opacity-70 text-muted-foreground">
                                                                            {u.createdAt ? formatDistanceToNow(u.createdAt.toDate(), { addSuffix: true }) : '-'}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <div className="flex justify-center">
                                                                            {u.tier === 'Super Premier' ? (
                                                                                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 rounded-full font-black text-[10px] uppercase h-6 px-3 flex gap-1">
                                                                                    <Sparkles className="h-3 w-3" /> Super
                                                                                </Badge>
                                                                            ) : u.tier === 'Premier' ? (
                                                                                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 rounded-full font-black text-[10px] uppercase h-6 px-3 flex gap-1">
                                                                                    <Crown className="h-3 w-3" /> Premier
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="opacity-50 rounded-full font-bold text-[10px] uppercase h-6 px-3 flex gap-1 border-white/20 text-muted-foreground">
                                                                                    <UserIcon className="h-3 w-3" /> Standard
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center justify-center gap-3">
                                                                            <Switch 
                                                                                checked={u.verified} 
                                                                                onCheckedChange={(v) => updateDocumentNonBlocking(doc(firestore, 'users', u.id), { verified: v })} 
                                                                                className="scale-90 data-[state=checked]:bg-green-500"
                                                                            />
                                                                            {u.verified ? (
                                                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                                            ) : (
                                                                                <UserX className="h-5 w-5 text-muted-foreground opacity-30" />
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="rounded-xl border-2 border-white/10 bg-[#1a1c23] text-white">
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                                        <Sparkles className="mr-2 h-4 w-4" /> Change Tier
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuPortal>
                                                                                        <DropdownMenuSubContent className="rounded-xl border-2 border-white/10 bg-[#1a1c23] text-white">
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserTier(u.id, 'Standard')}>
                                                                                                <UserIcon className="mr-2 h-4 w-4" /> Standard
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserTier(u.id, 'Premier')}>
                                                                                                <Crown className="mr-2 h-4 w-4" /> Premier
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserTier(u.id, 'Super Premier')}>
                                                                                                <Sparkles className="mr-2 h-4 w-4" /> Super Premier
                                                                                            </DropdownMenuItem>
                                                                                        </DropdownMenuSubContent>
                                                                                    </DropdownMenuPortal>
                                                                                </DropdownMenuSub>
                                                                                
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                                        <Briefcase className="mr-2 h-4 w-4" /> Change Role
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuPortal>
                                                                                        <DropdownMenuSubContent className="rounded-xl border-2 border-white/10 bg-[#1a1c23] text-white">
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserRole(u.id, 'Super Admin')}>Super Admin</DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserRole(u.id, 'Manager')}>Manager</DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserRole(u.id, 'Freelancer')}>Freelancer</DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserRole(u.id, 'Company')}>Company</DropdownMenuItem>
                                                                                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => handleUpdateUserRole(u.id, 'Authorized Pro')}>Authorized Pro</DropdownMenuItem>
                                                                                        </DropdownMenuSubContent>
                                                                                    </DropdownMenuPortal>
                                                                                </DropdownMenuSub>

                                                                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }} className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                                                                                </DropdownMenuItem>
                                                                                
                                                                                <DropdownMenuSeparator className="bg-white/5" />
                                                                                
                                                                                <DropdownMenuItem className="text-red-500 focus:text-red-500 rounded-lg focus:bg-red-500/5" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}>
                                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vacancies">
                    <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-6 w-6 text-orange-500" />
                                    <div>
                                        <CardTitle className="text-2xl font-black">Vacancy Management</CardTitle>
                                        <CardDescription className="text-muted-foreground">Manage all job vacancies in the system.</CardDescription>
                                    </div>
                                </div>
                                <Button onClick={() => { setSelectedVacancy(null); setIsVacancyFormOpen(true); }} className="bg-orange-500 hover:bg-orange-600 rounded-xl font-bold">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Post New Vacancy
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="font-bold text-white">Title</TableHead>
                                            <TableHead className="font-bold text-white">Company</TableHead>
                                            <TableHead className="font-bold text-white">Location</TableHead>
                                            <TableHead className="font-bold text-white">Type</TableHead>
                                            <TableHead className="font-bold text-white">Posted</TableHead>
                                            <TableHead className="text-right font-bold text-white">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isVacanciesLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader className="animate-spin mx-auto" /></TableCell></TableRow>
                                        ) : vacancies?.map(v => (
                                            <TableRow key={v.id} className="hover:bg-white/5 transition-colors border-white/5">
                                                <TableCell className="font-bold text-white">{v.title}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium text-white">{v.companyName}</div>
                                                        <div className="flex items-center gap-1">
                                                            {v.isCompanyVerified && (
                                                                <Badge variant="outline" className="text-[8px] rounded-full border-green-500/30 bg-green-500/10 text-green-500 font-bold px-2 py-0">
                                                                    <UserCheck className="h-2 w-2 mr-1" /> Verified
                                                                </Badge>
                                                            )}
                                                            {v.companyTier === 'Premier' && (
                                                                <Badge variant="outline" className="text-[8px] rounded-full border-purple-500/30 bg-purple-500/10 text-purple-500 font-bold px-2 py-0">
                                                                    <Crown className="h-2 w-2 mr-1" /> Premier
                                                                </Badge>
                                                            )}
                                                            {v.companyTier === 'Super Premier' && (
                                                                <Badge variant="outline" className="text-[8px] rounded-full border-blue-500/30 bg-blue-500/10 text-blue-500 font-bold px-2 py-0">
                                                                    <Sparkles className="h-2 w-2 mr-1" /> Super Premier
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{v.location}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-[#1a1c23] text-white text-[10px] font-bold uppercase rounded-full px-3">{v.employmentType}</Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground font-medium">
                                                    {v.postedAt ? formatDistanceToNow(v.postedAt.toDate(), { addSuffix: true }) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl border-2 border-white/10 bg-[#1a1c23] text-white">
                                                            <DropdownMenuItem onClick={() => { setSelectedVacancy(v); setIsVacancyFormOpen(true); }} className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleVacancyVerified(v)} className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                <UserCheck className="mr-2 h-4 w-4" /> Toggle Verified
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleVacancyPremier(v)} className="rounded-lg focus:bg-white/5 focus:text-white">
                                                                <Crown className="mr-2 h-4 w-4" /> Toggle Premier
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-white/5" />
                                                            <DropdownMenuItem onClick={() => { setSelectedVacancy(v); setIsVacancyDeleteDialogOpen(true); }} className="text-red-500 focus:text-red-500 rounded-lg focus:bg-red-500/5">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
                    <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white/5 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-6 w-6 text-orange-500" />
                                <div>
                                    <CardTitle className="text-2xl font-black">Payment Management</CardTitle>
                                    <CardDescription className="text-muted-foreground">View and manage all transactions.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                            <TableHead className="font-bold text-white">User</TableHead>
                                            <TableHead className="font-bold text-white">Plan</TableHead>
                                            <TableHead className="font-bold text-white text-center">Amount</TableHead>
                                            <TableHead className="font-bold text-white">Order ID</TableHead>
                                            <TableHead className="font-bold text-white text-center">Status</TableHead>
                                            <TableHead className="font-bold text-white">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isPaymentsLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader className="animate-spin mx-auto" /></TableCell></TableRow>
                                        ) : !payments || payments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                                                    No payments found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payments.map(p => (
                                                <TableRow key={p.id} className="hover:bg-white/5 transition-colors border-white/5">
                                                    <TableCell className="font-mono text-[10px] text-muted-foreground">{p.userId}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-white">{p.plan}</span>
                                                            <Badge variant="outline" className="text-[8px] h-4 uppercase border-white/10 bg-white/5 text-muted-foreground">{p.billingCycle}</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1 text-xs font-black text-orange-500">
                                                            <IndianRupee className="h-3 w-3" /> {p.amount}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[10px] opacity-70">{p.orderId}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={cn(
                                                            "text-[9px] font-black uppercase h-5 px-2 rounded-full border-none",
                                                            p.status === 'successful' ? "bg-green-500 text-white" : 
                                                            p.status === 'failed' ? "bg-red-500 text-white" : 
                                                            "bg-yellow-500 text-white"
                                                        )}>
                                                            {p.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {p.createdAt ? format(p.createdAt.toDate(), 'PP p') : '-'}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-6">
            <Card className="border-none rounded-2xl overflow-hidden bg-[#24262d]">
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
                    <Input value={publicApiKey} onChange={e => setPublicApiKey(e.target.value)} className="rounded-xl h-12 bg-[#1a1c23] border-none font-mono text-orange-500" placeholder="Enter public API key..." />
                    <p className="text-[10px] text-muted-foreground">This key will be used for client-side operations where needed.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-[#24262d]">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Manage Payment Method</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Globally enable or disable payments and choose the method for expert activation.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#1a1c23] rounded-xl border border-white/5">
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

            <Card className="border-none rounded-2xl overflow-hidden bg-[#24262d]">
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
                    <Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} className="rounded-xl h-12 bg-[#1a1c23] border-none font-black text-orange-500 text-xl" />
                    <p className="text-[10px] text-muted-foreground">Set the number of points awarded to a user for each successful referral.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-2xl overflow-hidden bg-[#24262d]">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-2xl font-black text-white">Global Settings</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">Control content, pricing, and payment links.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Homepage Categories */}
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
                                }} className="bg-[#1a1c23] border-none text-white h-10" />
                                <Input value={cat.icon} onChange={e => {
                                    const newCats = [...homepageCategories];
                                    newCats[idx].icon = e.target.value;
                                    setHomepageCategories(newCats);
                                }} className="bg-[#1a1c23] border-none text-white h-10 w-32" />
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-white/5" onClick={() => moveCategory(idx, 'up')} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-white/5" onClick={() => moveCategory(idx, 'down')} disabled={idx === homepageCategories.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => deleteCategory(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        ))}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Input placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="bg-[#1a1c23] border-dashed border-white/20 h-10 text-white" />
                            <Input placeholder="Icon Name" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="bg-[#1a1c23] border-dashed border-white/20 h-10 text-white" />
                            <Button onClick={addCategory} className="bg-orange-500 hover:bg-orange-600 h-10 font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                        </div>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Department Management */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-orange-500" />
                        <h4 className="font-black text-white">Department Management</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Create and manage company departments.</p>
                    <div className="space-y-2">
                        {departments.map((dep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-[#1a1c23] border border-white/5 rounded-lg">
                                <span className="font-bold text-sm px-2 text-white/80">{dep}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => deleteDepartment(dep)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <Input placeholder="New Department Name" value={newDepName} onChange={e => setNewDepName(e.target.value)} className="bg-[#1a1c23] border-dashed border-white/20 h-10 text-white" />
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
            <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
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

            <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
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

            <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden">
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
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border-none bg-[#1a1c23] text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black">Edit Expert Profile</DialogTitle></DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
        <DialogContent className="rounded-2xl border-none bg-[#1a1c23] text-white">
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

      <Dialog open={isVacancyFormOpen} onOpenChange={setIsVacancyFormOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border-none bg-[#1a1c23] text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black">{selectedVacancy ? 'Edit Vacancy' : 'Post New Vacancy'}</DialogTitle></DialogHeader>
          <PostVacancyForm 
            vacancy={selectedVacancy || undefined} 
            isAdmin 
            onSuccess={() => { setIsVacancyFormOpen(false); setSelectedVacancy(null); }} 
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isVacancyDeleteDialogOpen} onOpenChange={setIsVacancyDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none bg-[#1a1c23] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-white">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
                This action is permanent and will remove this job listing from the marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVacancy} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">Permanently Delete Vacancy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none bg-[#1a1c23] text-white">
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
