'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, getDocs, where, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, Search, PlusCircle, Mail, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, CreditCard, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown, Rss, UserPlus, Fingerprint, Award, CircleHelp, CheckCircle } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { cn } from '@/lib/utils';

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

type AppConfig = {
    featuredExpertsLimit?: number;
    announcementText?: string;
    isAnnouncementEnabled?: boolean;
    announcementSpeed?: number;
    isPaymentsEnabled?: boolean;
    paymentMethod?: 'API' | 'Link';
    referralRewardPoints?: number;
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
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [awardPoints, setAwardPoints] = useState(100);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified' | 'premier' | 'super'>('all');

  // App Config State
  const [featuredLimit, setFeaturedLimit] = useState(3);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementSpeed, setAnnouncementSpeed] = useState(20);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'API' | 'Link'>('API');
  const [referralPoints, setReferralPoints] = useState(100);

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  const usersQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersQuery);

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
      setReferralPoints(appConfig.referralRewardPoints || 100);
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
        referralRewardPoints: referralPoints,
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

  const handleExport = async () => {
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

  if (isUserLoading || isRoleLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  if (!isSuperAdmin) return <div className="flex h-screen items-center justify-center">Access Denied.</div>;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
                <Shield className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Super Admin</h1>
              <p className="text-muted-foreground text-sm font-medium">Welcome, {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl border-2" onClick={() => auth && signOut(auth).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 h-12 rounded-xl mb-8">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-background">Dashboard</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background">Settings</TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg data-[state=active]:bg-background">Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Total Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.total}</div><p className="text-[10px] text-muted-foreground mt-1">Total registered users</p></CardContent></Card>
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Verified Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.verified}</div><p className="text-[10px] text-muted-foreground mt-1">Total verified experts</p></CardContent></Card>
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Unverified Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.unverified}</div><p className="text-[10px] text-muted-foreground mt-1">Pending verification</p></CardContent></Card>
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Premier Experts</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-purple-500">{stats.premier}</div><p className="text-[10px] text-muted-foreground mt-1">Total Premier experts</p></CardContent></Card>
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Super Premier</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-blue-500">{stats.super}</div><p className="text-[10px] text-muted-foreground mt-1">Total Super Premier</p></CardContent></Card>
              <Card className="border-none bg-secondary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold opacity-70">Referrals Used</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{stats.referrals}</div><p className="text-[10px] text-muted-foreground mt-1">Total signups via referral</p></CardContent></Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="flex w-full bg-secondary/30 p-1 rounded-xl mb-6">
                    <TabsTrigger value="users" className="flex-1 rounded-lg">User Management</TabsTrigger>
                    <TabsTrigger value="vacancies" className="flex-1 rounded-lg">Vacancy Management</TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 rounded-lg">Payment Management</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="border-2 border-secondary/50 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-secondary/10 pb-6 border-b">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-primary" />
                                <div>
                                    <CardTitle className="text-2xl font-black">Expert Users</CardTitle>
                                    <CardDescription className="font-medium">Manage all registered users in the system.</CardDescription>
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
                                        className="pl-10 h-12 bg-secondary/20 border-none rounded-xl"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                                    <Button variant={userFilter === 'verified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'verified' ? 'all' : 'verified')}>Verified</Button>
                                    <Button variant={userFilter === 'unverified' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'unverified' ? 'all' : 'unverified')}>Unverified</Button>
                                    <Button variant={userFilter === 'premier' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'premier' ? 'all' : 'premier')}>Premier</Button>
                                    <Button variant={userFilter === 'super' ? 'default' : 'secondary'} size="sm" className="rounded-lg font-bold" onClick={() => setUserFilter(userFilter === 'super' ? 'all' : 'super')}>Super Premier</Button>
                                </div>
                            </div>

                            <Tabs defaultValue="all" className="w-full">
                                <TabsList className="grid grid-cols-4 bg-secondary/20 p-1 rounded-xl mb-4">
                                    <TabsTrigger value="all" className="rounded-lg font-bold">All Users</TabsTrigger>
                                    <TabsTrigger value="freelancer" className="rounded-lg font-bold">Freelancers</TabsTrigger>
                                    <TabsTrigger value="company" className="rounded-lg font-bold">Companies</TabsTrigger>
                                    <TabsTrigger value="pro" className="rounded-lg font-bold">Authorized Pros</TabsTrigger>
                                </TabsList>

                                {['all', 'freelancer', 'company', 'pro'].map((roleTab) => (
                                    <TabsContent key={roleTab} value={roleTab}>
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-secondary/10">
                                                    <TableRow>
                                                        <TableHead className="font-bold">Expert Details</TableHead>
                                                        <TableHead className="font-bold">Rewards</TableHead>
                                                        <TableHead className="font-bold">Role</TableHead>
                                                        <TableHead className="font-bold text-center">Joined</TableHead>
                                                        <TableHead className="font-bold text-center">Tier</TableHead>
                                                        <TableHead className="font-bold text-center">Verification</TableHead>
                                                        <TableHead className="text-right font-bold"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredUsers
                                                        .filter(u => roleTab === 'all' || u.role.toLowerCase().includes(roleTab))
                                                        .map(u => {
                                                            const usedCount = referralUsageMap[u.referralCode || ''] || 0;
                                                            return (
                                                                <TableRow key={u.id} className="hover:bg-secondary/5 transition-colors">
                                                                    <TableCell>
                                                                        <div className="flex items-start gap-3">
                                                                            <Avatar className="h-12 w-12 border-2 border-secondary shrink-0 mt-1">
                                                                                <AvatarImage src={u.photoUrl} />
                                                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="space-y-1">
                                                                                <div className="font-black text-sm">{u.firstName} {u.lastName}</div>
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
                                                                                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-secondary/50 px-1.5 py-0.5 rounded">
                                                                                        <Key className="h-2.5 w-2.5" /> {u.referralCode || '-'}
                                                                                    </div>
                                                                                    {u.referredByCode && (
                                                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded h-4 border-primary/20 bg-primary/5">{u.referredByCode}</Badge>
                                                                                    )}
                                                                                    <Badge className={cn("text-[9px] px-1.5 py-0 rounded h-4", usedCount > 0 ? "bg-orange-500 hover:bg-orange-600" : "bg-muted")}>Used: {usedCount}</Badge>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-xs font-bold text-primary">{u.referralPoints || 0}</div>
                                                                                <div className="text-[10px] font-medium opacity-70">Points</div>
                                                                            </div>
                                                                            <Button 
                                                                                variant="outline" 
                                                                                size="sm" 
                                                                                className="h-7 px-2 rounded-lg text-[10px] font-bold border-2"
                                                                                onClick={() => { setSelectedUser(u); setIsAwardDialogOpen(true); }}
                                                                            >
                                                                                <Award className="mr-1 h-3 w-3" /> Award
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary" className="rounded-md font-bold text-[10px] uppercase tracking-wider h-6">{u.role}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <div className="text-[10px] font-medium opacity-70">
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
                                                                                <Badge variant="outline" className="opacity-50 rounded-full font-bold text-[10px] uppercase h-6 px-3 flex gap-1">
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
                                                                                className="scale-90"
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
                                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="rounded-xl border-2">
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger className="rounded-lg">
                                                                                        <Sparkles className="mr-2 h-4 w-4" /> Change Tier
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuPortal>
                                                                                        <DropdownMenuSubContent className="rounded-xl border-2">
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Standard')}>
                                                                                                <UserIcon className="mr-2 h-4 w-4" /> Standard
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Premier')}>
                                                                                                <Crown className="mr-2 h-4 w-4" /> Premier
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserTier(u.id, 'Super Premier')}>
                                                                                                <Sparkles className="mr-2 h-4 w-4" /> Super Premier
                                                                                            </DropdownMenuItem>
                                                                                        </DropdownMenuSubContent>
                                                                                    </DropdownMenuPortal>
                                                                                </DropdownMenuSub>
                                                                                
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger className="rounded-lg">
                                                                                        <Briefcase className="mr-2 h-4 w-4" /> Change Role
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuPortal>
                                                                                        <DropdownMenuSubContent className="rounded-xl border-2">
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Super Admin')}>Super Admin</DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Manager')}>Manager</DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Freelancer')}>Freelancer</DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Company')}>Company</DropdownMenuItem>
                                                                                            <DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Authorized Pro')}>Authorized Pro</DropdownMenuItem>
                                                                                        </DropdownMenuSubContent>
                                                                                    </DropdownMenuPortal>
                                                                                </DropdownMenuSub>

                                                                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }} className="rounded-lg">
                                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                                                                                </DropdownMenuItem>
                                                                                
                                                                                <DropdownMenuSeparator />
                                                                                
                                                                                <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}>
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
                    <Card className="p-12 text-center border-dashed">
                        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-bold">Vacancy Management</h3>
                        <p className="text-muted-foreground">Detailed job listing controls are under development.</p>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card className="p-12 text-center border-dashed">
                        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-bold">Payment Management</h3>
                        <p className="text-muted-foreground">Financial oversight and ledger controls are under development.</p>
                    </Card>
                </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-6">
            <Card className="border-2 rounded-2xl overflow-hidden">
              <CardHeader className="bg-secondary/10 border-b">
                <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl font-black">Global Controls</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                    <div>
                        <Label className="text-base font-bold">Announcement Banner</Label>
                        <p className="text-xs text-muted-foreground">Toggle the visibility of the scrolling banner.</p>
                    </div>
                    <Switch checked={announcementEnabled} onCheckedChange={setAnnouncementEnabled} />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Banner Text</Label>
                    <Input value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="rounded-xl h-12 bg-secondary/20 border-none" />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <Label className="font-bold">Scroll Speed</Label>
                        <span className="text-xs font-black text-primary">{announcementSpeed}s</span>
                    </div>
                    <Slider value={[announcementSpeed]} onValueChange={v => setAnnouncementSpeed(v[0])} min={5} max={60} step={1} />
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label className="font-bold">Referral Points Reward</Label>
                    <div className="relative">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} className="pl-10 rounded-xl h-12 bg-secondary/20 border-none font-bold" />
                    </div>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/10 p-6 border-t">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full h-12 rounded-xl font-black text-lg">
                    {isSaving ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Save className="mr-2 h-5 w-5" />} 
                    Save All Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-0 space-y-6">
            <Card className="border-2 rounded-2xl">
              <CardHeader className="bg-secondary/10 border-b rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <UserPlus className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl font-black">Manual User Provisioning</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <CreateUserForm onSuccess={() => toast({ title: "User created" })} />
              </CardContent>
            </Card>

            <Card className="border-2 rounded-2xl">
              <CardHeader className="bg-secondary/10 border-b rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <HardDriveDownload className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl font-black">System Maintenance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-6 bg-secondary/10 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                        <Fingerprint className="h-5 w-5 text-primary" />
                        <h4 className="font-black">JSON Data Backup</h4>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Export a complete snapshot of all critical platform collections including Users, Companies, Vacancies, and App Configuration.</p>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting} className="w-full h-12 rounded-xl border-2 font-bold">
                        {isExporting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <HardDriveDownload className="mr-2 h-4 w-4" />} 
                        Generate Export Package
                    </Button>
                </div>
                <Separator />
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5 text-primary" />
                        <Label className="text-base font-black">Bulk CSV Import</Label>
                    </div>
                    <Textarea placeholder="firstName, lastName, email, role, password..." className="min-h-[120px] rounded-xl bg-secondary/20 border-none p-4 font-mono text-xs" />
                    <Button variant="secondary" className="w-full h-12 rounded-xl font-bold">
                        <Upload className="mr-2 h-4 w-4" /> 
                        Process Import Stream
                    </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl border-2">
          <DialogHeader><DialogTitle className="text-2xl font-black">Edit Expert Profile</DialogTitle></DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
        <DialogContent className="rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Award Referral Points</DialogTitle>
            <DialogDescription className="font-medium">
                Manually grant extra referral points to {selectedUser?.firstName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label className="font-bold">Points Amount</Label>
                <Input 
                    type="number" 
                    value={awardPoints} 
                    onChange={(e) => setAwardPoints(Number(e.target.value))}
                    className="rounded-xl h-12 bg-secondary/20 border-none font-black text-xl"
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAwardDialogOpen(false)} className="rounded-xl border-2">Cancel</Button>
            <Button onClick={handleAwardPoints} className="rounded-xl font-bold">Grant Reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
                This action is permanent and will remove this expert's profile, post history, and authentication credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 rounded-xl">Permanently Delete User</AlertDialogAction>
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
