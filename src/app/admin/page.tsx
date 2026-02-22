
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, Search, PlusCircle, Mail, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, CreditCard, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown, Rss } from 'lucide-react';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { EditProfileForm } from '@/components/auth/edit-profile-form';

type ExpertUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'Super Admin' | 'Manager' | 'Freelancer' | 'Company' | 'Authorized Pro';
    photoUrl?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    referralCode?: string;
    referralPoints?: number;
    createdAt?: Timestamp;
};

type Post = {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Timestamp;
};

type Vacancy = {
    id: string;
    title: string;
    companyName: string;
    location: string;
    postedAt: Timestamp;
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

const chartConfig = {
  users: {
    label: "Users Joined",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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

  const postsQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: posts } = useCollection<Post>(postsQuery);

  const vacanciesQuery = useMemoFirebase(() => isSuperAdmin ? query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: vacancies } = useCollection<Vacancy>(vacanciesQuery);

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

  const growthData = useMemo(() => {
    if (!users) return [];
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const date = u.createdAt ? format(u.createdAt.toDate(), 'MMM dd') : 'Unknown';
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, users: count })).reverse().slice(-7);
  }, [users]);

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
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Platform oversight and growth management.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => auth && signOut(auth).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-fit gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="vacancies">Vacancies</TabsTrigger>
            <TabsTrigger value="posts">Feed</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Experts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{users?.length || 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Verified Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{users?.filter(u => u.verified).length || 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Premium Members</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{users?.filter(u => u.tier === 'Premier' || u.tier === 'Super Premier').length || 0}</div></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>User Growth</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={growthData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Expert Directory</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Expert</TableHead><TableHead>Role</TableHead><TableHead>Tier</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {users?.map(u => (
                      <TableRow key={u.id}>
                        <TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={u.photoUrl} /><AvatarFallback>{u.firstName[0]}</AvatarFallback></Avatar><div><div className="font-medium">{u.firstName} {u.lastName}</div><div className="text-xs text-muted-foreground">{u.email}</div></div></div></TableCell>
                        <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                        <TableCell>{u.tier === 'Super Premier' ? <Badge className="bg-blue-500">Super</Badge> : u.tier === 'Premier' ? <Badge className="bg-purple-500">Premier</Badge> : <Badge variant="outline">Standard</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub><DropdownMenuSubTrigger><Key className="mr-2 h-4 w-4" /> Change Role</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent><DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Super Admin')}>Super Admin</DropdownMenuItem><DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Manager')}>Manager</DropdownMenuItem><DropdownMenuItem onClick={() => handleUpdateUserRole(u.id, 'Freelancer')}>Freelancer</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                              <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(firestore, 'users', u.id), { verified: !u.verified })}><Shield className="mr-2 h-4 w-4" /> Toggle Verification</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Global Controls</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Enable Banner</Label><Switch checked={announcementEnabled} onCheckedChange={setAnnouncementEnabled} /></div>
                <div className="space-y-2"><Label>Banner Text</Label><Input value={announcementText} onChange={e => setAnnouncementText(e.target.value)} /></div>
                <div className="space-y-2"><Label>Scroll Speed ({announcementSpeed}s)</Label><Slider value={[announcementSpeed]} onValueChange={v => setAnnouncementSpeed(v[0])} min={5} max={60} step={1} /></div>
                <Separator />
                <div className="space-y-2"><Label>Referral Points</Label><Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} /></div>
              </CardContent>
              <CardFooter><Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">{isSaving ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />} Save All Settings</Button></CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Manual Creation</CardTitle></CardHeader>
              <CardContent><CreateUserForm onSuccess={() => toast({ title: "User created" })} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Platform Data</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={handleExport} disabled={isExporting} className="w-full">{isExporting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <HardDriveDownload className="mr-2 h-4 w-4" />} Export JSON Backup</Button>
                <Separator />
                <div className="space-y-4"><Label>Bulk CSV Import</Label><Textarea placeholder="firstName, lastName, email, role..." className="min-h-[100px]" /><Button variant="secondary" className="w-full"><Upload className="mr-2 h-4 w-4" /> Process CSV</Button></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>This action is permanent.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => selectedUser && deleteDoc(doc(firestore, 'users', selectedUser.id))}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
