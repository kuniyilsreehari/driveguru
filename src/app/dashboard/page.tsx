'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, doc, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { LogOut, Loader, Edit, UserCheck, User as UserIcon, MessageSquare, Gift, Info, Book, Pen, PlusCircle, MapPin, IndianRupee, Calendar, GraduationCap, School, Building, Home, Rss, Users, Link as LinkIcon, AlertCircle, CheckCircle, Eye, EyeOff, Clock, Crown, Sparkles, ChevronUp, ChevronDown, ChevronRight, Shield, CheckCircle2, ShieldAlert, ShieldCheck, ArrowRight, Type, List, Briefcase, Share2, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { PostForm } from '@/components/post-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from '@/components/user-list';
import { ProfileCompletionWizard } from '@/components/profile-completion-wizard';
import { formatDistanceToNowStrict, subDays } from 'date-fns';

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    photoUrl?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    isAvailable?: boolean;
    hiddenUntil?: Timestamp | null;
    lastProfileUpdate?: Timestamp | null;
    referralCode?: string;
    referralPoints?: number;
    referralCount?: number;
    following?: string[];
    groups?: string[];
    profession?: string;
    category?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    experienceYears?: number;
    pricingModel?: string;
    pricingValue?: number;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    companyName?: string;
    department?: string;
    aboutMe?: string;
    aboutYourDream?: string;
    associatedProjectsName?: string;
    gender?: string;
    phoneNumber?: string;
    businessDescription?: string;
};

const postFormSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(2).max(1000),
  link: z.string().url().optional().or(z.literal('')),
});

export default function ExpertDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [isHideDialogOpen, setIsHideDialogOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

  const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
  const { data: appConfig } = useDoc<any>(appConfigDocRef);

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const postForm = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { title: '', content: '', link: '' },
  });

  const profileCompletion = useMemo(() => {
    if (!userProfile) return 0;
    const fields = [
        userProfile.firstName, 
        userProfile.photoUrl, 
        userProfile.profession, 
        userProfile.skills, 
        userProfile.qualification,
        userProfile.aboutMe,
        userProfile.city,
        userProfile.phoneNumber
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  }, [userProfile]);

  const needsUpdate = useMemo(() => {
    if (!userProfile) return false;
    const ninetyDaysAgo = subDays(new Date(), 90);
    const lastUpdate = userProfile.lastProfileUpdate?.toDate() || new Date(0);
    return profileCompletion < 80 || lastUpdate < ninetyDaysAgo;
  }, [userProfile, profileCompletion]);

  const myPostsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "posts"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, user]);
  const { data: myPosts, isLoading: isPostsLoading } = useCollection<any>(myPostsQuery);

  const followersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('following', 'array-contains', user.uid));
  }, [firestore, user]);
  const { data: myFollowers } = useCollection(followersQuery);

  const myGroupsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.groups || userProfile.groups.length === 0) return null;
    return query(collection(firestore, 'groups'), where('__name__', 'in', userProfile.groups));
  }, [firestore, userProfile?.groups]);
  const { data: myGroups, isLoading: isMyGroupsLoading } = useCollection(myGroupsQuery);

  const handleHideProfile = (hours: number) => {
    if (!userDocRef) return;
    const hideUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    updateDocumentNonBlocking(userDocRef, { hiddenUntil: Timestamp.fromDate(hideUntil) });
    toast({ 
        title: "Profile Hidden", 
        description: `Your profile will be hidden for ${hours >= 24 ? `${hours/24} day(s)` : `${hours} hour(s)`}.` 
    });
    setIsHideDialogOpen(false);
  }

  const handleUnhideProfile = () => {
    if (!userDocRef) return;
    updateDocumentNonBlocking(userDocRef, { hiddenUntil: null });
    toast({ title: "Profile Visible", description: "Your profile is now visible to everyone." });
  }

  async function onPostSubmit(values: z.infer<typeof postFormSchema>) {
    if (!firestore || !user) return;
    setIsSubmittingPost(true);
    try {
      addDocumentNonBlocking(collection(firestore, 'posts'), {
        ...values,
        authorId: user.uid,
        authorName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        createdAt: serverTimestamp(),
        likes: [],
      });
      toast({ title: "Post Published!" });
      postForm.reset();
      setShowPostForm(false);
    } finally {
      setIsSubmittingPost(false);
    }
  }

  if (isUserLoading || isProfileLoading || isRoleLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin text-orange-500" /></div>;
  if (!user) return null;

  if (!userProfile) {
      if (isSuperAdmin) {
          return (
              <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground p-8 text-center">
                  <div className="bg-orange-500/10 p-6 rounded-[2rem] mb-6">
                    <Shield className="h-16 w-16 text-orange-500" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight">Administrative Session</h2>
                  <p className="text-muted-foreground mt-2 max-w-sm font-medium">You are logged in as a Super Admin. To view your expert dashboard, please complete your profile or switch to the Admin panel.</p>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 rounded-2xl font-black h-14 px-8 shadow-xl shadow-orange-500/20 uppercase tracking-widest">
                        <Link href="/admin">Super Admin Panel</Link>
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setIsEditDialogOpen(true)} className="border-border bg-card hover:bg-muted rounded-2xl font-black h-14 px-8 uppercase tracking-widest">
                        Create Expert Profile
                    </Button>
                  </div>
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-background p-8 shadow-2xl">
                      <DialogHeader className="mb-6"><DialogTitle className="text-2xl sm:text-3xl font-black text-foreground uppercase italic tracking-tight">Create Admin Profile</DialogTitle></DialogHeader>
                      <div className="p-4"><EditProfileForm userProfile={{ id: user.uid, firstName: 'Admin', lastName: 'User', role: 'Super Admin', email: user.email } as any} isAdmin onSuccess={() => window.location.reload()} /></div>
                    </DialogContent>
                  </Dialog>
              </div>
          );
      }
      return null;
  }

  const isHidden = userProfile.hiddenUntil && userProfile.hiddenUntil.toDate() > new Date();
  const rewardPointsSetting = appConfig?.referralRewardPoints || 0;
  const displayPoints = (userProfile.referralCount || 0) * rewardPointsSetting;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        
        {needsUpdate && (
            <Card className="mb-8 border-none bg-primary text-primary-foreground rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-500">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="bg-white/20 p-3 rounded-full">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold sm:font-black uppercase italic tracking-tight text-sm sm:text-lg">Profile Boost Available</h4>
                            <p className="text-xs font-medium opacity-80">Update details to increase visibility.</p>
                        </div>
                    </div>
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsEditDialogOpen(true)}
                        className="bg-white text-primary hover:bg-white/90 font-bold rounded-xl h-10 px-6 uppercase tracking-wider text-xs"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" /> Update Now
                    </Button>
                </CardContent>
            </Card>
        )}

        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-border mb-8">
          <div>
            <h1 className="text-xl sm:text-4xl font-black tracking-tight text-foreground uppercase italic">Dashboard</h1>
            <p className="text-muted-foreground text-[10px] sm:text-sm font-medium">Manage professional identity and rewards.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                className="rounded-xl border-2 border-border bg-background text-foreground hover:bg-muted font-bold h-10 px-4 uppercase text-xs" 
                onClick={() => auth && signOut(auth).then(() => router.push('/'))}
            >
                <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full bg-muted p-1 h-12 rounded-2xl mb-8">
            <TabsTrigger value="overview" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all">Overview</TabsTrigger>
            <TabsTrigger value="network" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all">Network</TabsTrigger>
            <TabsTrigger value="feed" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all">My Feed</TabsTrigger>
            <TabsTrigger value="plans" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-8">
            <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-6 sm:p-10 text-center flex flex-col items-center">
                <div className="relative mb-6">
                    <Avatar className="h-20 w-20 sm:h-32 sm:w-32 border-4 border-border shadow-2xl">
                        <AvatarImage src={userProfile.photoUrl} className="object-cover" />
                        <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xl">
                            {userProfile.firstName?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    {userProfile.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 sm:p-1.5 rounded-full border-4 border-card shadow-xl">
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                    )}
                </div>
                
                <h2 className="text-xl sm:text-5xl font-black text-foreground tracking-tighter uppercase italic mb-2">
                    {userProfile.firstName} {userProfile.lastName}
                </h2>
                
                <div className="flex items-center gap-4 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-orange-500" /> <span className="text-orange-500">{myFollowers?.length || 0}</span> FOLLOWERS</span>
                    <div className="h-3 w-px bg-border" />
                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-orange-500" /> <span className="text-orange-500">{userProfile.following?.length || 0}</span> FOLLOWING</span>
                </div>

                <Badge className="font-black bg-foreground text-background border-none text-xs sm:text-2xl uppercase tracking-[0.2em] px-6 py-3 rounded-xl sm:rounded-[1.5rem] mb-8 shadow-xl">
                    {userProfile.role}
                </Badge>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4">
                    <div className="bg-background p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between border border-border shadow-inner">
                        <div className="flex items-center gap-4 text-left">
                            <Switch checked={userProfile.isAvailable} onCheckedChange={(v) => updateDocumentNonBlocking(userDocRef!, { isAvailable: v })} className="data-[state=checked]:bg-[#22c55e] scale-90 sm:scale-110" />
                            <div>
                                <p className="font-black text-[8px] sm:text-xs text-foreground uppercase tracking-widest">HIRING STATUS</p>
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground">{userProfile.isAvailable ? "AVAILABLE NOW" : "UNAVAILABLE"}</p>
                            </div>
                        </div>
                        {userProfile.isAvailable && <CheckCircle2 className="text-[#22c55e] h-4 w-4 sm:h-6 sm:w-6" />}
                    </div>

                    <div className="bg-background p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between border border-border shadow-inner">
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-2 bg-muted rounded-xl">
                                {isHidden ? <EyeOff className="text-orange-500 h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />}
                            </div>
                            <div>
                                <p className="font-black text-[8px] sm:text-xs text-foreground uppercase tracking-widest">VISIBILITY</p>
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase">{isHidden ? "Hidden" : "Publicly Active"}</p>
                            </div>
                        </div>
                        {isHidden ? (
                            <Button size="sm" variant="ghost" onClick={handleUnhideProfile} className="h-8 px-3 font-black text-[8px] uppercase text-orange-500">Unhide</Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setIsHideDialogOpen(true)} className="h-8 px-3 font-black text-[8px] uppercase border-border rounded-lg">Hide</Button>
                        )}
                    </div>
                </div>

                <div className="w-full space-y-3 mt-10">
                    <div className="flex justify-between items-end">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary italic">Profile Completion</span>
                        <span className="text-xs sm:text-lg font-black text-foreground">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-1.5 bg-muted rounded-full overflow-hidden" />
                </div>

                <Button onClick={() => setIsEditDialogOpen(true)} className="w-full max-w-sm mt-10 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-12 shadow-xl shadow-orange-500/20 uppercase tracking-wider text-xs">
                    <Edit className="mr-2 h-4 w-4" /> UPDATE PROFILE
                </Button>
            </Card>

            <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
                <CardHeader className="text-center pt-8 sm:pt-10 pb-4">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">UNIQUE REFERRAL ID</p>
                </CardHeader>
                <CardContent className="px-6 sm:px-10 pb-8 sm:pb-10 flex flex-col items-center">
                    <h2 className="text-2xl sm:text-7xl font-black text-orange-500 tracking-[0.2em] uppercase italic mb-8 font-mono">
                        {userProfile.referralCode || 'UR3664XN'}
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
                        <Button 
                            variant="outline" 
                            className="h-12 sm:h-16 rounded-xl sm:rounded-[1.5rem] border-none bg-muted hover:bg-muted/80 text-foreground font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-3 shadow-inner"
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userProfile.referralCode}`); toast({ title: "Link Copied" }); }}
                        >
                            <LinkIcon className="h-4 w-4" /> COPY LINK
                        </Button>
                        <Button 
                            className="h-12 sm:h-16 rounded-xl sm:rounded-[1.5rem] bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] hover:bg-[#16a34a] hover:text-white font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-3"
                            onClick={() => window.open(`https://wa.me/?text=Join my professional network on DriveGuru using code: ${userProfile.referralCode}`, '_blank')}
                        >
                            <MessageSquare className="h-4 w-4" /> WHATSAPP
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full">
                        <div className="bg-background p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-center border border-border shadow-inner">
                            <p className="text-xl sm:text-5xl font-black text-orange-500 mb-1">{displayPoints}</p>
                            <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">PREMIUM CREDITS</p>
                        </div>
                        <div className="bg-background p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-center border border-border shadow-inner">
                            <p className="text-xl sm:text-5xl font-black text-foreground mb-1">{userProfile.referralCount || 0}</p>
                            <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">SUCCESSFUL JOINS</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-0">
            <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-muted/30 border-b border-border pb-6 px-6 sm:px-10">
                    <CardTitle className="text-lg sm:text-2xl font-black text-foreground uppercase italic">Connections</CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-10">
                    <Tabs defaultValue="my-groups" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-10 rounded-xl mb-8">
                            <TabsTrigger value="my-groups" className="rounded-lg font-bold text-[8px] sm:text-[10px] uppercase">Groups</TabsTrigger>
                            <TabsTrigger value="followers" className="rounded-lg font-bold text-[8px] sm:text-[10px] uppercase">Followers</TabsTrigger>
                            <TabsTrigger value="following" className="rounded-lg font-bold text-[8px] sm:text-[10px] uppercase">Following</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="my-groups" className="space-y-6 mt-0">
                            {isMyGroupsLoading ? (
                                <div className="flex justify-center p-12"><Loader className="animate-spin h-8 w-8 text-orange-500" /></div>
                            ) : myGroups && myGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myGroups.map(group => (
                                        <Link key={group.id} href={`/groups/${group.id}`}>
                                            <div className="p-5 bg-background border border-border rounded-2xl hover:bg-muted transition-all flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm sm:text-lg uppercase italic">{group.name}</h4>
                                                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1">{group.members?.length || 0} Members</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 opacity-40">
                                    <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">No active memberships.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="followers" className="mt-0">
                            <UserList userIdsQuery={followersQuery} emptyStateMessage="You don't have any followers yet." />
                        </TabsContent>

                        <TabsContent value="following" className="mt-0">
                            <UserList userIds={userProfile?.following || []} emptyStateMessage="You haven't followed any experts yet." />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed" className="mt-0 space-y-6">
            {!showPostForm ? (
              <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-muted/30 border-b border-border pb-8 px-6 sm:px-10">
                  <CardTitle className="text-lg sm:text-2xl font-black text-foreground uppercase italic">Community Updates</CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-10 space-y-8">
                  <Button variant="secondary" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-14 text-sm uppercase shadow-xl tracking-tight" size="lg" onClick={() => setShowPostForm(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> SHARE PROFESSIONAL UPDATE
                  </Button>

                  <div className="space-y-6">
                    <h4 className="font-black text-foreground text-[8px] sm:text-[10px] uppercase italic tracking-[0.3em]">Your Recent Activity</h4>
                    {isPostsLoading ? (
                      <div className="flex justify-center p-12"><Loader className="animate-spin h-8 w-8 text-orange-500" /></div>
                    ) : myPosts && myPosts.length > 0 ? (
                      <div className="space-y-4">
                        {myPosts.map((post: any) => (
                          <div key={post.id} className="p-5 bg-background border border-border rounded-2xl">
                            <p className="text-sm sm:text-lg font-black text-foreground mb-2 uppercase italic">{post.title || 'Professional Update'}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.content}</p>
                            <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase text-orange-500/50 tracking-widest">{post.createdAt ? formatDistanceToNowStrict(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                              <Link href={`/feed?authorId=${user.uid}`} className="text-[8px] font-black uppercase text-orange-500 hover:underline">View Post</Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 opacity-30 italic text-[8px] font-black uppercase tracking-widest text-foreground">No activity recorded.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border p-6 sm:p-8">
                  <CardTitle className="text-lg sm:text-2xl font-black text-foreground uppercase italic">Draft Update</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowPostForm(false)} className="rounded-xl uppercase font-bold text-[8px] tracking-widest">Discard</Button>
                </CardHeader>
                <CardContent className="p-6 sm:p-10">
                  <PostForm form={postForm} onSubmit={onPostSubmit} isSubmitting={isSubmittingPost} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <Card className="border-none bg-card rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn("p-6 rounded-2xl border-2 transition-all", (userProfile.tier === 'Standard' || !userProfile.tier) ? "border-orange-500 bg-orange-500/5 shadow-2xl" : "border-border bg-background")}>
                  <h3 className="text-lg sm:text-2xl font-black text-foreground mb-1 uppercase italic tracking-tight text-center">Standard</h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-center mb-8">ENTRY LEVEL</p>
                  <ul className="space-y-4 mb-10 text-[9px] font-bold uppercase tracking-tight text-foreground/70">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Basic Profile Listing</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 3 Portfolio Image Slots</li>
                  </ul>
                  <Button disabled className="w-full rounded-xl bg-muted text-muted-foreground font-bold uppercase text-[9px] h-10">Current Plan</Button>
                </div>

                <div className={cn("p-6 rounded-2xl border-2 transition-all relative overflow-hidden", userProfile.tier === 'Premier' ? "border-orange-500 bg-orange-500/5 shadow-2xl scale-105" : "border-border bg-background")}>
                  <div className="absolute top-0 right-0 p-1.5 bg-orange-500 text-white font-black text-[7px] uppercase tracking-widest -rotate-45 translate-x-4 translate-y-1">MOST POPULAR</div>
                  <h3 className="text-lg sm:text-2xl font-black text-foreground mb-1 uppercase italic tracking-tight text-center">Premier</h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-orange-500 text-center mb-8">POWER PROFESSIONAL</p>
                  <ul className="space-y-4 mb-10 text-[9px] font-bold uppercase tracking-tight text-foreground/70">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> High Search Priority</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 6 Portfolio Image Slots</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> AI Bio Generator</li>
                  </ul>
                  <Button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-[9px] h-10" asChild>
                    <Link href="/payment/premier">Upgrade Now</Link>
                  </Button>
                </div>

                <div className={cn("p-6 rounded-2xl border-2 transition-all", userProfile.tier === 'Super Premier' ? "border-blue-500 bg-blue-500/5 shadow-2xl scale-105" : "border-border bg-background")}>
                  <h3 className="text-lg sm:text-2xl font-black text-foreground mb-1 uppercase italic tracking-tight text-center">Super</h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 text-center mb-8">ELITE EXECUTIVE</p>
                  <ul className="space-y-4 mb-10 text-[9px] font-bold uppercase tracking-tight text-foreground/70">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Max Search Exposure</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 9 Portfolio Image Slots</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Homepage Carousel</li>
                  </ul>
                  <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[9px] h-10" asChild>
                    <Link href="/payment/super-premier">Unlock Elite</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isHideDialogOpen} onOpenChange={setIsHideDialogOpen}>
          <DialogContent className="max-w-md rounded-[2rem] border-none bg-background text-foreground p-8">
              <DialogHeader className="items-center text-center">
                  <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4"><EyeOff className="text-orange-500 h-10 w-10" /></div>
                  <DialogTitle className="text-xl sm:text-3xl font-black uppercase italic">Hide Profile</DialogTitle>
                  <UiDialogDescription className="text-muted-foreground font-medium pt-2">Temporarily remove your card from public search results.</UiDialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-8">
                  <Button variant="secondary" className="h-12 font-bold rounded-xl border border-border bg-muted hover:bg-muted/80 uppercase text-[9px]" onClick={() => handleHideProfile(1)}>1 Hour</Button>
                  <Button variant="secondary" className="h-12 font-bold rounded-xl border border-border bg-muted hover:bg-muted/80 uppercase text-[9px]" onClick={() => handleHideProfile(24)}>1 Day</Button>
                  <Button variant="secondary" className="h-12 font-bold rounded-xl border border-border bg-muted hover:bg-muted/80 uppercase text-[9px]" onClick={() => handleHideProfile(72)}>3 Days</Button>
                  <Button variant="secondary" className="h-12 font-bold rounded-xl border border-border bg-muted hover:bg-muted/80 uppercase text-[9px]" onClick={() => handleHideProfile(168)}>1 Week</Button>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setIsHideDialogOpen(false)} className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase text-[9px]">Cancel</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-background p-8 shadow-2xl">
          <DialogHeader className="mb-6"><DialogTitle className="text-xl sm:text-3xl font-black text-foreground uppercase italic tracking-tight">Edit Expert Profile</DialogTitle></DialogHeader>
          <div className="p-4">{userProfile && <EditProfileForm userProfile={userProfile as any} onSuccess={() => setIsEditDialogOpen(false)} />}</div>
        </DialogContent>
      </Dialog>

      <ProfileCompletionWizard isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} userProfile={userProfile} />
    </div>
  );
}