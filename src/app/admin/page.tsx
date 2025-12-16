
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, deleteDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection, setDocumentNonBlocking } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
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
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

type AppConfig = {
    featuredExpertsLimit?: number;
};

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [featuredExpertsLimit, setFeaturedExpertsLimit] = useState(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = superAdminData !== null;

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isSuperAdmin]);

  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersCollectionRef);
  
  const appConfigDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
  
  useEffect(() => {
    // When the component loads and we have the appConfig data
    if (!isAppConfigLoading) {
      if (appConfig?.featuredExpertsLimit) {
        // If config exists, set the state from it
        setFeaturedExpertsLimit(appConfig.featuredExpertsLimit);
      } else if (appConfig === null && appConfigDocRef) {
        // If document doesn't exist (appConfig is null), create it with a default
        setDocumentNonBlocking(appConfigDocRef, { featuredExpertsLimit: 3 }, { merge: true });
      }
    }
  }, [appConfig, isAppConfigLoading, appConfigDocRef]);


  const verifiedCount = users?.filter(u => u.verified).length || 0;
  const unverifiedCount = users?.filter(u => !u.verified).length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const openDeleteDialog = (user: ExpertUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = () => {
    if (!selectedUser || !firestore) return;
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userDocRef);
    toast({
        title: "User Deleted",
        description: `${selectedUser.firstName} ${selectedUser.lastName} has been removed.`,
    });
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  }

  const handleTierChange = (expert: ExpertUser, tier: ExpertUser['tier']) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', expert.id);
    updateDocumentNonBlocking(userDocRef, { tier });
    toast({
        title: "Expert Tier Updated",
        description: `${expert.firstName} ${expert.lastName}'s tier is now ${tier}.`
    });
  }

  const handleVerificationToggle = (expert: ExpertUser) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', expert.id);
    const newVerifiedStatus = !expert.verified;
    updateDocumentNonBlocking(userDocRef, { verified: newVerifiedStatus });
    toast({
        title: `Expert ${newVerifiedStatus ? 'Verified' : 'Unverified'}`,
        description: `${expert.firstName} ${expert.lastName} is now ${newVerifiedStatus ? 'verified' : 'unverified'}.`
    });
  }

  const handleSaveSettings = async () => {
    if (!appConfigDocRef) return;
    setIsSavingSettings(true);
    try {
        await setDocumentNonBlocking(appConfigDocRef, { featuredExpertsLimit: Number(featuredExpertsLimit) }, { merge: true });
        toast({
            title: "Settings Saved",
            description: "Homepage settings have been updated.",
        });
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Error saving settings",
            description: "Could not save settings. Please try again.",
        });
    } finally {
        setIsSavingSettings(false);
    }
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  const renderTierBadge = (tier?: ExpertUser['tier']) => {
    switch (tier) {
        case 'Premier':
            return <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>;
        case 'Super Premier':
            return <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>;
        default:
            return <Badge variant="secondary"><UserIcon className="mr-1 h-3 w-3" /> Standard</Badge>;
    }
  }

  const isLoading = isUserLoading || isRoleLoading;
  const areTablesLoading = isSuperAdmin && isUsersLoading;


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
              <Ban className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-2xl text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>You do not have the necessary permissions to view this page. Please contact an administrator if you believe this is an error.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between pb-8">
            <div className="flex items-center gap-4">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Super Admin</h1>
                <p className="text-muted-foreground">Welcome, {user?.email || 'Admin'}.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </header>

          <main>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified Experts</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Total number of verified experts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unverified Experts</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{unverifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Experts pending verification</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Experts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total registered experts</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mb-8">
              <CardHeader>
                  <div className="flex items-center gap-3">
                      <Settings className="h-6 w-6" />
                      <div>
                          <CardTitle>Homepage Settings</CardTitle>
                          <CardDescription>Control content displayed on the main landing page.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  {isAppConfigLoading ? (
                      <div className="flex items-center space-x-2">
                          <Loader className="h-4 w-4 animate-spin" />
                          <p className="text-sm text-muted-foreground">Loading settings...</p>
                      </div>
                  ) : (
                    <div className="flex items-end gap-4">
                      <div className="flex-grow">
                          <Label htmlFor="featured-limit">Featured Experts Limit</Label>
                          <Input 
                              id="featured-limit"
                              type="number" 
                              value={featuredExpertsLimit}
                              onChange={(e) => setFeaturedExpertsLimit(Number(e.target.value))}
                              min="1"
                              max="12"
                              className="mt-1"
                          />
                      </div>
                      <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                          {isSavingSettings ? (
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Settings
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6" />
                  <div>
                    <CardTitle>Expert Users</CardTitle>
                    <CardDescription>A list of all registered experts in the system.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {areTablesLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Loading experts...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Tier</TableHead>
                        <TableHead className="text-center">Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((expert) => (
                          <TableRow key={expert.id}>
                            <TableCell>
                              <Avatar>
                                  <AvatarFallback>{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{expert.firstName} {expert.lastName}</TableCell>
                            <TableCell>{expert.email}</TableCell>
                            <TableCell className="text-center">{renderTierBadge(expert.tier)}</TableCell>
                            <TableCell className="text-center">
                                <div className='flex items-center justify-center space-x-2'>
                                    <Switch id={`verified-switch-${expert.id}`} checked={expert.verified || false} onCheckedChange={() => handleVerificationToggle(expert)} />
                                    {expert.verified ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Ban className="h-5 w-5 text-destructive" />}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger><Sparkles className="mr-2 h-4 w-4" /><span>Change Tier</span></DropdownMenuSubTrigger>
                                            <DropdownMenuPortal><DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => handleTierChange(expert, 'Standard')}><UserIcon className="mr-2 h-4 w-4" />Standard</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleTierChange(expert, 'Premier')}><Crown className="mr-2 h-4 w-4" />Premier</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleTierChange(expert, 'Super Premier')}><Sparkles className="mr-2 h-4 w-4" />Super Premier</DropdownMenuItem>
                                            </DropdownMenuSubContent></DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuItem onClick={() => toast({ title: "Edit clicked", description: "Edit functionality coming soon!"})}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteDialog(expert)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : ( <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No experts found.</TableCell></TableRow> )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              for <span className="font-bold">{selectedUser?.firstName} {selectedUser?.lastName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    