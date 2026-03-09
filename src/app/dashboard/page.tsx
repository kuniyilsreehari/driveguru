'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, doc, Timestamp, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { LogOut, Loader, Edit, UserCheck, User as UserIcon, MessageSquare, Gift, Info, Book, Pen, PlusCircle, MapPin, IndianRupee, Calendar, GraduationCap, School, Building, Home, Rss, Users, Link as LinkIcon, AlertCircle, CheckCircle, Eye, EyeOff, Clock, Crown, Sparkles, ChevronUp, ChevronDown, Shield } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { ProfileCompletionWizard } from '@/components/profile-completion-wizard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDistanceToNow } from 'date-fns';

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
    referralCode?: string;
    referralPoints?: number;
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
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [isHideDialogOpen, setIsHideDialogOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

  const superAdminDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_super_admin', user.uid) : null, [firestore, user]);
  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile?.hiddenUntil && userDocRef) {
        const hideDate = userProfile.hiddenUntil.toDate();
        if (hideDate < new Date()) {
            updateDocumentNonBlocking(userDocRef, { hiddenUntil: null });
            toast({ title: "Profile Visible", description: "Your temporary hide period has ended." });
        }
    }
  }, [userProfile, userDocRef, toast]);

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

  const referralsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.referralCode) return null;
    return query(collection(firestore, 'users'), where('referredByCode', '==', userProfile.referralCode));
  }, [firestore, userProfile?.referralCode]);
  const { data: myReferrals } = useCollection(referralsQuery);

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
              <div className="flex h-screen flex-col items-center justify-center bg-[#1a1c23] text-white p-8 text-center">
                  <div className="bg-orange-500/10 p-6 rounded-[2rem] mb-6">
                    <Shield className="h-16 w-16 text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tight">Administrative Session</h2>
                  <p className="text-muted-foreground mt-2 max-w-sm font-medium">You are logged in as a Super Admin. To view your expert dashboard, please complete your profile or switch to the Admin panel.</p>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 rounded-2xl font-black h-14 px-8 shadow-xl shadow-orange-500/20 uppercase tracking-widest">
                        <Link href="/admin">Super Admin Panel</Link>
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setIsEditDialogOpen(true)} className="border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl font-black h-14 px-8 uppercase tracking-widest">
                        Create Expert Profile
                    </Button>
                  </div>
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-[#1a1c23] p-8 shadow-2xl">
                      <DialogHeader className="mb-6"><DialogTitle className="text-3xl font-black text-white uppercase italic tracking-tight">Create Admin Profile</DialogTitle></DialogHeader>
                      <div className="p-4"><EditProfileForm userProfile={{ id: user.uid, firstName: 'Admin', lastName: 'User', role: 'Super Admin', email: user.email } as any} isAdmin onSuccess={() => window.location.reload()} /></div>
                    </DialogContent>
                  </Dialog>
              </div>
          );
      }
      return null;
  }

  const isHidden = userProfile.hiddenUntil && userProfile.hiddenUntil.toDate() > new Date();

  return (
    <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4 border-b border-white/5 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Expert Dashboard</h1>
            <p className="text-muted-foreground text-sm font-medium">Elevate your professional presence and expand your network.</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl border-2 border-white/10 bg-transparent text-white hover:bg-white/5 font-black h-12 uppercase" 
            onClick={() => auth && signOut(auth).then(() => router.push('/'))}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full bg-white/5 p-1 h-14 rounded-2xl mb-8">
            <TabsTrigger value="overview" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">Overview</TabsTrigger>
            <TabsTrigger value="network" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">Network</TabsTrigger>
            <TabsTrigger value="feed" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">My Feed</TabsTrigger>
            <TabsTrigger value="plans" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">Upgrade Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-8">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl">
              <Collapsible open={isProfileExpanded} onOpenChange={setIsProfileExpanded}>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 bg-white/5 border-b border-white/5">
                  <Avatar className="h-24 w-24 border-4 border-orange-500/20 cursor-pointer hover:border-orange-500/50 transition-all shadow-xl" onClick={() => setIsEditDialogOpen(true)}>
                    <AvatarImage src={userProfile.photoUrl} className="object-cover" />
                    <AvatarFallback className="text-[10px] text-center px-2 font-bold leading-tight bg-orange-500/10 text-orange-500 uppercase">Profile<br/>Image</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">{userProfile.companyName || userProfile.firstName}!</h2>
                      <div className="flex items-center gap-2">
                        {userProfile.verified && <div className="bg-green-500 p-1 rounded-full"><UserCheck className="h-3.5 w-3.5 text-white" /></div>}
                        {userProfile.tier === 'Premier' && <Crown className="h-5 w-5 text-purple-500 fill-purple-500" />}
                        {userProfile.tier === 'Super Premier' && <Sparkles className="h-5 w-5 text-blue-500 fill-blue-500" />}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)} className="h-8 w-8 text-muted-foreground hover:text-white">
                              <Edit className="h-4 w-4" />
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                              {isProfileExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-orange-500" /> {myFollowers?.length || 0} Followers</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-orange-500" /> {userProfile.following?.length || 0} Following</span>
                    </div>
                    <div className="flex wrap gap-2 mt-3">
                      <Badge variant="secondary" className="font-black bg-white/10 text-white border-none text-[10px] uppercase tracking-widest px-4 py-1 rounded-full">{userProfile.role}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                      <Button onClick={() => setIsEditDialogOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl h-14 px-8 shadow-xl shadow-orange-500/20 uppercase tracking-widest">
                          <Edit className="mr-2 h-5 w-5" /> Update Profile
                      </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl flex items-center justify-between border border-white/5">
                          <div className="flex items-center gap-3">
                              <Switch 
                                  checked={userProfile.isAvailable} 
                                  onCheckedChange={(v) => updateDocumentNonBlocking(userDocRef!, { isAvailable: v })} 
                                  className="data-[state=checked]:bg-green-500"
                              />
                              <div>
                                <p className="font-black text-sm text-white uppercase italic">Hiring Status</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available for immediate booking.</p>
                              </div>
                          </div>
                          {userProfile.isAvailable ? <CheckCircle className="text-green-500 h-5 w-5" /> : <Clock className="text-muted-foreground h-5 w-5 opacity-30" />}
                      </div>

                      <div className={cn("p-5 rounded-2xl flex items-center justify-between transition-colors border", isHidden ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/5")}>
                          <div className="flex items-center gap-3">
                              {isHidden ? <EyeOff className="text-orange-500 h-5 w-5" /> : <Eye className="text-muted-foreground h-5 w-5" />}
                              <div>
                                <p className="font-black text-sm text-white uppercase italic">Card Visibility</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {isHidden 
                                        ? `Hidden until ${formatDistanceToNow(userProfile.hiddenUntil!.toDate(), { addSuffix: true })}` 
                                        : "Your professional card is active."
                                    }
                                </p>
                              </div>
                          </div>
                          {isHidden ? (
                              <Button size="sm" variant="ghost" onClick={handleUnhideProfile} className="h-8 font-black text-[10px] uppercase text-orange-500 hover:text-orange-400 hover:bg-orange-500/5">Unhide</Button>
                          ) : (
                              <Button size="sm" variant="outline" onClick={() => setIsHideDialogOpen(true)} className="h-8 font-black text-[10px] uppercase border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white">Hide Card</Button>
                          )}
                      </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-primary italic">Profile Completion Level</span>
                      <span className="text-xl font-black text-white">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-3 bg-white/5" />
                  </div>

                  <CollapsibleContent className="space-y-6 pt-6 border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                        <div className="flex items-center gap-3 text-sm">
                            <UserIcon className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Gender</span>
                            <span className={cn("text-white font-bold", !userProfile.gender && "text-red-500/50")}>{userProfile.gender || 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <IndianRupee className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Rate</span>
                            <span className={cn("text-white font-bold", !userProfile.pricingValue && "text-red-500/50")}>{userProfile.pricingValue ? `₹${userProfile.pricingValue} / ${userProfile.pricingModel || 'hr'}` : 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Exp.</span>
                            <span className={cn("text-white font-bold", !userProfile.experienceYears && "text-red-500/50")}>{userProfile.experienceYears ? `${userProfile.experienceYears} years` : 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Location</span>
                            <span className={cn("text-white font-bold", !userProfile.city && !userProfile.state && !userProfile.pincode && "text-red-500/50")}>{[userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ') || 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <GraduationCap className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Degree</span>
                            <span className={cn("text-white font-bold", !userProfile.qualification && "text-red-500/50")}>{userProfile.qualification || 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <School className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">College</span>
                            <span className={cn("text-white font-bold", !userProfile.collegeName && "text-red-500/50")}>{userProfile.collegeName || 'Pending'}</span>
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-8">
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3 italic"><Info className="h-4 w-4" /> Bio / Summary</h4>
                            <p className={cn("text-sm font-medium leading-relaxed", !userProfile.aboutMe ? "text-red-500/50 italic" : "text-white/70")}>
                              {userProfile.aboutMe || 'Biography pending completion.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3 italic"><Book className="h-4 w-4" /> Technical Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {userProfile.skills ? userProfile.skills.split(',').map((s, i) => (
                                    <Badge key={i} variant="secondary" className="bg-white/10 text-white border-none font-bold text-xs px-3 py-1 rounded-lg">{s.trim()}</Badge>
                                )) : <span className="text-xs text-red-500/50 font-bold italic">Skills list pending.</span>}
                            </div>
                        </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>

            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-white uppercase italic">
                        <Gift className="h-6 w-6 text-orange-500" /> Affiliate Network
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Leverage your code to earn premium platform rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Unique Referral ID</p>
                            <p className="text-3xl font-black font-mono tracking-[0.2em] text-orange-500">{userProfile.referralCode || 'GENERATING...'}</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button variant="outline" size="lg" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userProfile.referralCode}`); toast({ title: "Copied!" }); }} className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 font-black uppercase text-xs">
                                <LinkIcon className="h-4 w-4 mr-2" /> Copy link
                            </Button>
                            <Button variant="outline" size="lg" className="bg-green-600/10 text-green-500 border-green-600/20 hover:bg-green-600 hover:text-white flex-1 rounded-xl font-black uppercase text-xs" onClick={() => window.open(`https://wa.me/?text=Join my professional network on DriveGuru using code: ${userProfile.referralCode}`, '_blank')}>
                                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center shadow-inner group hover:bg-white/10 transition-colors">
                            <p className="text-4xl font-black text-orange-500 mb-1 group-hover:scale-110 transition-transform">{userProfile.referralPoints || 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Premium Credits</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center shadow-inner group hover:bg-white/10 transition-colors">
                            <p className="text-4xl font-black text-white mb-1 group-hover:scale-110 transition-transform">{myReferrals?.length || 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Successful Joins</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-0">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="text-2xl font-black text-white uppercase italic">Connections & Circles</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Manage your professional industry relationships.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs defaultValue="my-groups" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 h-12 rounded-xl mb-8">
                            <TabsTrigger value="my-groups" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">My Groups</TabsTrigger>
                            <TabsTrigger value="followers" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">Followers <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none font-bold text-[10px]">{myFollowers?.length || 0}</Badge></TabsTrigger>
                            <TabsTrigger value="following" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">Following <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none font-bold text-[10px]">{userProfile?.following?.length || 0}</Badge></TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="my-groups" className="space-y-4 mt-0">
                            {isMyGroupsLoading ? (
                                <div className="flex justify-center p-8"><Loader className="animate-spin h-8 w-8 text-orange-500" /></div>
                            ) : myGroups && myGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myGroups.map(group => (
                                        <Link key={group.id} href={`/groups/${group.id}`}>
                                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group shadow-md">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-black text-white text-lg group-hover:text-orange-500 transition-colors uppercase italic">{group.name}</h4>
                                                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mt-1">{group.members?.length || 0} Members</p>
                                                    </div>
                                                    <PlusCircle className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-all rotate-45" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white/5 rounded-3xl border-4 border-dashed border-white/5">
                                    <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-10" />
                                    <p className="text-muted-foreground font-black uppercase italic">No active group memberships.</p>
                                    <Button variant="link" asChild className="mt-2 text-orange-500 font-black uppercase tracking-widest text-[10px]">
                                        <Link href="/groups">Discover professional circles</Link>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="followers" className="mt-0">
                            <UserList userIdsQuery={followersQuery} emptyStateMessage="Your network is waiting. Start sharing updates to attract followers." />
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
              <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-white uppercase italic">
                    <Rss className="h-6 w-6 text-orange-500" /> Industry Updates
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-medium">Broadcast your wins, ask questions, and lead discussions.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1 bg-white text-black hover:bg-white/90 font-black rounded-2xl h-14 text-lg uppercase shadow-xl" size="lg">
                    <Link href="/feed">Public Feed</Link>
                  </Button>
                  <Button variant="secondary" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl h-14 text-lg border-none uppercase shadow-xl" size="lg" onClick={() => setShowPostForm(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Share Update
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="flex flex-row items-center justify-between bg-white/5 border-b border-white/5 p-6">
                  <div>
                    <CardTitle className="text-2xl font-black text-white uppercase italic">Draft Update</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Your update will be visible to the entire professional community.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPostForm(false)} className="rounded-xl hover:bg-white/10 uppercase font-bold text-[10px]">Discard</Button>
                </CardHeader>
                <CardContent className="p-8">
                  <PostForm form={postForm} onSubmit={onPostSubmit} isSubmitting={isSubmittingPost} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                <CardTitle className="text-2xl font-black text-white uppercase italic">Subscription Matrix</CardTitle>
                <CardDescription className="text-muted-foreground font-medium">Unlock priority placement and AI-powered networking tools.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                {/* Standard Plan */}
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", (userProfile.tier === 'Standard' || !userProfile.tier) ? "border-orange-500 bg-orange-500/5 shadow-2xl" : "border-white/5 bg-[#1a1c23] opacity-60")}>
                  <div className="bg-white/5 p-4 rounded-full mb-4"><UserIcon className="h-8 w-8 text-muted-foreground" /></div>
                  <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter italic">Standard</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8">Base Tier</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Basic Profile Listing</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Standard Search Ranking</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Referral Rewards Program</li>
                  </ul>
                  {(userProfile.tier === 'Standard' || !userProfile.tier) ? <Button disabled className="w-full h-12 rounded-xl bg-white/10 text-muted-foreground font-black uppercase tracking-widest text-[10px]">Active</Button> : <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 font-black uppercase tracking-widest text-[10px]" asChild><Link href="/dashboard">Selected</Link></Button>}
                </div>
                {/* Premier Plan */}
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", userProfile.tier === 'Premier' ? "border-orange-500 bg-orange-500/5 shadow-2xl scale-105" : "border-white/5 bg-[#1a1c23]")}>
                  <div className="bg-orange-500/10 p-4 rounded-full mb-4"><Crown className="h-8 w-8 text-orange-500" /></div>
                  <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter italic">Premier</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-8">Power Professional</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> High Priority Search Ranking</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> AI Bio & Profile Generator</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Smart Skills Suggestions</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Featured Purple Badge</li>
                  </ul>
                  {userProfile.tier === 'Premier' ? <Button disabled className="w-full h-12 rounded-xl bg-white/10 text-muted-foreground font-black uppercase tracking-widest text-[10px]">Active</Button> : <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black uppercase tracking-widest text-[10px] shadow-xl" asChild><Link href="/payment/premier">Upgrade Now</Link></Button>}
                </div>
                {/* Super Premier Plan */}
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", userProfile.tier === 'Super Premier' ? "border-orange-500 bg-orange-500/5 shadow-2xl scale-105" : "border-white/5 bg-[#1a1c23]")}>
                  <div className="bg-blue-500/10 p-4 rounded-full mb-4"><Sparkles className="h-8 w-8 text-blue-500" /></div>
                  <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter italic">Super</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">Elite Executive</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Maximum Search Visibility</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> AI Natural Language Search</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Featured on Homepage Carousel</li>
                    <li className="flex items-center gap-2 text-xs font-black text-white/70 uppercase"><CheckCircle className="h-4 w-4 text-green-500" /> Elite Blue Verification Badge</li>
                  </ul>
                  {userProfile.tier === 'Super Premier' ? <Button disabled className="w-full h-12 rounded-xl bg-white/10 text-muted-foreground font-black uppercase tracking-widest text-[10px]">Active</Button> : <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] shadow-xl" asChild><Link href="/payment/super-premier">Unlock Elite Access</Link></Button>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isHideDialogOpen} onOpenChange={setIsHideDialogOpen}>
          <DialogContent className="max-w-md rounded-[2rem] border-none bg-[#1a1c23] text-white p-8">
              <DialogHeader className="items-center text-center">
                  <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4">
                    <EyeOff className="text-orange-500 h-10 w-10" />
                  </div>
                  <DialogTitle className="text-3xl font-black uppercase italic">Hide Card</DialogTitle>
                  <UiDialogDescription className="text-muted-foreground font-medium pt-2">Instantly remove your professional card from all public search results.</UiDialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-8">
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 uppercase text-[10px]" onClick={() => handleHideProfile(1)}>1 Hour</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 uppercase text-[10px]" onClick={() => handleHideProfile(24)}>1 Day</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 uppercase text-[10px]" onClick={() => handleHideProfile(72)}>3 Days</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 uppercase text-[10px]" onClick={() => handleHideProfile(168)}>1 Week</Button>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setIsHideDialogOpen(false)} className="w-full h-12 rounded-xl text-muted-foreground hover:text-white font-black uppercase text-[10px]">Cancel Action</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-[#1a1c23] p-8 shadow-2xl">
          <DialogHeader className="mb-6"><DialogTitle className="text-3xl font-black text-white uppercase italic tracking-tight">Edit Expert Profile</DialogTitle></DialogHeader>
          <div className="p-4">{userProfile && <EditProfileForm userProfile={userProfile as any} onSuccess={() => setIsEditDialogOpen(false)} />}</div>
        </DialogContent>
      </Dialog>

      <ProfileCompletionWizard isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} userProfile={userProfile} />
    </div>
  );
}
