
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, ThumbsUp, ThumbsDown, Star, Search, PlusCircle, Mail, Edit3, Link as LinkIcon, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, CreditCard, AlertTriangle, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown } from 'lucide-react';
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
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
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
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Vacancy } from '@/app/vacancies/page';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { exportAllData } from '@/ai/flows/export-data-flow';
import { importUsers } from '@/ai/flows/import-users-flow';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { processReferral } from '@/ai/flows/process-referral-flow';
import { v4 as uuidv4 } from 'uuid';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";

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
    referredByCode?: string | null;
    createdAt?: Timestamp;
    phoneNumber?: string;
    companyName?: string;
};

type Payment = {
    id: string;
    userId: string;
    plan: string;
    amount: number;
    status: 'pending' | 'successful' | 'failed';
    createdAt: Timestamp;
};

type AppConfig = {
    featuredExpertsLimit?: number;
    homepageCategories?: any[];
    departments?: string[];
    pricingModels?: string[];
    premierPlanPrices?: any;
    superPremierPlanPrices?: any;
    verificationFee?: number;
    isAnnouncementEnabled?: boolean;
    announcementText?: string;
    announcementSpeed?: number;
    isPaymentsEnabled?: boolean;
    paymentMethod?: 'API' | 'Link';
    referralRewardPoints?: number;
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
  const [isImporting, setIsImporting] = useState(false);
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

  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore, isSuperAdmin]);

  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersQuery);

  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);

  const { data: appConfig, isLoading: isConfigLoading } = useDoc<AppConfig>(appConfigDocRef);

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
        referralRewardPoints: referralPoints,
      }, { merge: true });
      toast({ title: "Settings Saved", description: "System configuration updated successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setIsSaving(false);
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
      toast({ title: "Export Complete", description: "Backup downloaded successfully." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => auth && signOut(auth).then(() => router.push('/'));

  if (isUserLoading || isRoleLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  }

  if (!isSuperAdmin) {
    return <div className="flex h-screen items-center justify-center">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
          <div className="flex items-center gap-4">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage platform users, settings, and growth.</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tools">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Experts</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{users?.length || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Verified Users</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{users?.filter(u => u.verified).length || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Premium Members</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{users?.filter(u => u.tier === 'Premier' || u.tier === 'Super Premier').length || 0}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Daily signup activity over the last 7 days.</CardDescription>
              </CardHeader>
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
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Audit profiles, verify experts, and manage roles.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expert</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarImage src={u.photoUrl} /><AvatarFallback>{u.firstName[0]}</AvatarFallback></Avatar>
                            <div><div className="font-medium">{u.firstName} {u.lastName}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                        <TableCell>
                          {u.tier === 'Super Premier' ? <Badge className="bg-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super</Badge> : 
                           u.tier === 'Premier' ? <Badge className="bg-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge> : 
                           <Badge variant="outline">Standard</Badge>}
                        </TableCell>
                        <TableCell>{u.verified ? <CheckCircle2 className="text-green-500 h-5 w-5" /> : <UserX className="text-muted-foreground h-5 w-5" />}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(firestore, 'users', u.id), { verified: !u.verified })}><Shield className="mr-2 h-4 w-4" /> Toggle Verification</DropdownMenuItem>
                              <DropdownMenuSeparator />
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
              <CardHeader><CardTitle>Global Announcement</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Scrolling Banner</Label>
                  <Switch checked={announcementEnabled} onCheckedChange={setAnnouncementEnabled} />
                </div>
                <div className="space-y-2">
                  <Label>Banner Text</Label>
                  <Input value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="e.g. Welcome to DriveGuru v2!" />
                </div>
                <div className="space-y-2">
                  <Label>Scroll Speed ({announcementSpeed}s)</Label>
                  <Slider value={[announcementSpeed]} onValueChange={v => setAnnouncementSpeed(v[0])} min={5} max={60} step={1} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payments & Rewards</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Payments Enabled</Label>
                  <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
                </div>
                <div className="space-y-2">
                  <Label>Referral Points Reward</Label>
                  <Input type="number" value={referralPoints} onChange={e => setReferralPoints(Number(e.target.value))} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Configuration
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Data Backup</CardTitle><CardDescription>Download a full snapshot of the platform database.</CardDescription></CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleExport} disabled={isExporting} className="w-full">
                  {isExporting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <HardDriveDownload className="mr-2 h-4 w-4" />}
                  Export All Data (JSON)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bulk Import</CardTitle><CardDescription>Import experts from a CSV file template.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Paste CSV data here..." className="min-h-[100px]" />
                <Button variant="secondary" className="w-full"><Upload className="mr-2 h-4 w-4" /> Process Import</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit Expert Profile</DialogTitle></DialogHeader>
          {selectedUser && <EditProfileForm userProfile={selectedUser as any} isAdmin onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete User?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the expert account.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => selectedUser && deleteDoc(doc(firestore, 'users', selectedUser.id))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
