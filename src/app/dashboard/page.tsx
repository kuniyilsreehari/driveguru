'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, orderBy, query, where, limit, arrayUnion, arrayRemove, doc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Loader, Edit, UserCheck, User as UserIcon, MessageSquare, Gift, Info, Book, Pen, PlusCircle, MapPin, IndianRupee, Calendar, GraduationCap, School, Building, Home, Share2, Rss, UserPlus, Users, Link as LinkIcon, Search, AlertCircle, Check, CheckCircle, ArrowUpCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Crown, Sparkles, Eye, EyeOff, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [isHideDialogOpen, setIsHideDialogOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

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

  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('verified', '==', true), limit(20));
  }, [firestore, user]);
  const { data: allUsers } = useCollection<ExpertUserProfile>(suggestionsQuery);

  const suggestedExperts = useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers.filter(u => 
        u.id !== user.uid && 
        !(userProfile?.following?.includes(u.id)) &&
        (suggestionSearch === '' || 
         `${u.firstName} ${u.lastName}`.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
         u.profession?.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
         u.role?.toLowerCase().includes(suggestionSearch.toLowerCase()))
    );
  }, [allUsers, user, userProfile, suggestionSearch]);

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

  const handleToggleFollow = async (targetId: string, isFollowing: boolean) => {
    if (!userDocRef || !userProfile) return;
    const action = isFollowing ? arrayRemove(targetId) : arrayUnion(targetId);
    updateDocumentNonBlocking(userDocRef, { following: action });
    
    if (!isFollowing) {
        const targetNotifRef = collection(firestore, 'users', targetId, 'notifications');
        addDocumentNonBlocking(targetNotifRef, {
            type: 'new_follower',
            message: `${userProfile.firstName} ${userProfile.lastName} started following you.`,
            link: `/expert/${user?.uid}`,
            read: false,
            actorId: user?.uid,
            actorName: `${userProfile.firstName} ${userProfile.lastName}`,
            actorPhotoUrl: userProfile.photoUrl || '',
            createdAt: serverTimestamp(),
        });
    }
    
    toast({ title: isFollowing ? "Unfollowed" : "Following" });
  };

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

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  if (!user || !userProfile) return null;

  const isHidden = userProfile.hiddenUntil && userProfile.hiddenUntil.toDate() > new Date();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expert Dashboard</h1>
          <Button variant="outline" onClick={() => signOut(auth!).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full bg-secondary/50 grid-cols-4">
            <TabsTrigger value="overview">Dashboard</TabsTrigger>
            <TabsTrigger value="network">My Network</TabsTrigger>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="plans">My Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-8">
            <Card className="border-2 overflow-hidden">
              <Collapsible open={isProfileExpanded} onOpenChange={setIsProfileExpanded}>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-2">
                  <Avatar className="h-24 w-24 border-4 border-primary/20 cursor-pointer" onClick={() => setIsEditDialogOpen(true)}>
                    <AvatarImage src={userProfile.photoUrl} />
                    <AvatarFallback className="text-[10px] text-center px-2 font-bold leading-tight">click here to change image</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold">Welcome, {userProfile.companyName || userProfile.firstName}!</h2>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isProfileExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {myFollowers?.length || 0} Followers</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {userProfile.following?.length || 0} Following</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userProfile.verified && <Badge className="bg-green-600 text-white border-none font-bold"><UserCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
                      {userProfile.tier === 'Super Premier' && (
                        <Badge className="bg-blue-600 text-white border-none font-black text-[10px] uppercase h-6 px-3 flex items-center gap-1 shadow-lg shadow-blue-500/20">
                          <Sparkles className="h-3 w-3" /> Super Premier
                        </Badge>
                      )}
                      {userProfile.tier === 'Premier' && (
                        <Badge className="bg-purple-600 text-white border-none font-black text-[10px] uppercase h-6 px-3 flex items-center gap-1 shadow-lg shadow-purple-500/20">
                          <Crown className="h-3 w-3" /> Premier
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-bold">{userProfile.role}</Badge>
                      {userProfile.companyName && <Badge variant="outline" className="font-bold">{userProfile.companyName}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="w-full">
                          <Edit className="mr-2 h-4 w-4" /> Edit Profile
                      </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Availability Toggle */}
                      <div className="bg-secondary/20 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <Switch 
                                  checked={userProfile.isAvailable} 
                                  onCheckedChange={(v) => updateDocumentNonBlocking(userDocRef!, { isAvailable: v })} 
                              />
                              <div>
                                <p className="font-bold text-sm">Available for Work</p>
                                <p className="text-[10px] text-muted-foreground">Toggle your active hiring status.</p>
                              </div>
                          </div>
                          {userProfile.isAvailable ? <CheckCircle className="text-green-500 h-5 w-5" /> : <Clock className="text-muted-foreground h-5 w-5" />}
                      </div>

                      {/* Visibility Control */}
                      <div className={cn("p-4 rounded-xl flex items-center justify-between transition-colors", isHidden ? "bg-orange-500/10 border border-orange-500/30" : "bg-secondary/20")}>
                          <div className="flex items-center gap-3">
                              {isHidden ? <EyeOff className="text-orange-500 h-5 w-5" /> : <Eye className="text-muted-foreground h-5 w-5" />}
                              <div>
                                <p className="font-bold text-sm">Profile Visibility</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {isHidden 
                                        ? `Hidden until ${formatDistanceToNow(userProfile.hiddenUntil!.toDate(), { addSuffix: true })}` 
                                        : "Your profile is public."
                                    }
                                </p>
                              </div>
                          </div>
                          {isHidden ? (
                              <Button size="sm" variant="ghost" onClick={handleUnhideProfile} className="h-8 font-black text-[10px] uppercase text-orange-500 hover:text-orange-600 hover:bg-orange-500/5">Unhide Now</Button>
                          ) : (
                              <Button size="sm" variant="outline" onClick={() => setIsHideDialogOpen(true)} className="h-8 font-black text-[10px] uppercase">Temp Hide</Button>
                          )}
                      </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-primary">
                      <span>Profile Completion</span>
                      <span>{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-3 bg-secondary" />
                  </div>

                  {profileCompletion < 100 && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-primary" />
                              <div>
                                  <p className="font-bold">Complete Your Profile!</p>
                                  <p className="text-sm text-muted-foreground">A complete profile helps you stand out and attract more clients. Click the button below to add your missing details.</p>
                              </div>
                          </div>
                          <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto">
                            <Edit className="mr-2 h-4 w-4" /> Update Profile
                          </Button>
                      </div>
                  )}

                  <CollapsibleContent className="space-y-6 transition-all duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-4">
                        <div className="flex items-center gap-3 text-sm">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Gender:</span>
                            <span className={cn(!userProfile.gender && "text-destructive")}>{userProfile.gender || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Rate:</span>
                            <span className={cn(!userProfile.pricingValue && "text-destructive")}>{userProfile.pricingValue ? `₹${userProfile.pricingValue} / ${userProfile.pricingModel || 'hr'}` : 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Experience:</span>
                            <span className={cn(!userProfile.experienceYears && "text-destructive")}>{userProfile.experienceYears ? `${userProfile.experienceYears} years` : 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Location:</span>
                            <span className={cn(!userProfile.city && !userProfile.state && !userProfile.pincode && "text-destructive")}>{[userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ') || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Qualification:</span>
                            <span className={cn(!userProfile.qualification && "text-destructive")}>{userProfile.qualification || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <School className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">College:</span>
                            <span className={cn(!userProfile.collegeName && "text-destructive")}>{userProfile.collegeName || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Business:</span>
                            <span className={cn(!userProfile.companyName && "text-destructive")}>{userProfile.companyName || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold w-24">Address:</span>
                            <span className={cn("truncate", !userProfile.address && "text-destructive")}>{userProfile.address || 'Not specified'}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Info className="h-4 w-4" /> About Me</h4>
                            <p className={cn("text-sm", !userProfile.aboutMe ? "text-destructive" : "text-muted-foreground")}>
                              {userProfile.aboutMe || 'No information provided.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Pen className="h-4 w-4" /> About My Dream</h4>
                            <p className={cn("text-sm", !userProfile.aboutYourDream ? "text-destructive" : "text-muted-foreground")}>
                              {userProfile.aboutYourDream || 'No information provided.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Building className="h-4 w-4" /> Associated Projects</h4>
                            <p className={cn("text-sm", !userProfile.associatedProjectsName ? "text-destructive" : "text-muted-foreground")}>
                              {userProfile.associatedProjectsName || 'No projects listed.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Book className="h-4 w-4" /> Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {userProfile.skills ? userProfile.skills.split(',').map((s, i) => (
                                    <Badge key={i} variant="secondary">{s.trim()}</Badge>
                                )) : <span className="text-sm text-destructive">No skills listed.</span>}
                            </div>
                        </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" /> Referral Rewards
                    </CardTitle>
                    <CardDescription>Invite others and earn rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-secondary/30 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Your Referral Code</p>
                            <p className="text-2xl font-mono font-bold tracking-widest">{userProfile.referralCode || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userProfile.referralCode}`); toast({ title: "Copied!" }); }} className="flex-1">
                                <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                            </Button>
                            <Button variant="outline" size="sm" className="bg-green-600/10 text-green-600 border-green-600/20 hover:bg-green-600 hover:text-white flex-1" onClick={() => window.open(`https://wa.me/?text=Join me on DriveGuru using my referral code: ${userProfile.referralCode}`, '_blank')}>
                                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-secondary/20 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-primary">{userProfile.referralPoints || 0}</p>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Total Points Earned</p>
                        </div>
                        <div className="bg-secondary/20 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold">{myReferrals?.length || 0}</p>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Referrals Used</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden shadow-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="text-2xl font-black text-white">People You May Know</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Expand your network by following other verified experts.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                            placeholder="Search suggestions..." 
                            className="pl-12 h-14 bg-[#1a1c23] border-2 border-orange-500 rounded-2xl text-white text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-orange-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                            value={suggestionSearch} 
                            onChange={(e) => setSuggestionSearch(e.target.value)} 
                        />
                    </div>

                    <div className="relative">
                        <div className="flex gap-6 overflow-x-auto pb-8 pt-2 scrollbar-hide snap-x px-1">
                            {suggestedExperts.map(expert => (
                                <Card key={expert.id} className="min-w-[240px] max-w-[240px] bg-[#1a1c23] border-white/5 flex flex-col items-center p-8 text-center rounded-[2rem] snap-start transition-all hover:scale-[1.05] hover:shadow-2xl hover:shadow-orange-500/10 group">
                                    <div className="relative mb-6">
                                        <Avatar className="h-24 w-24 border-4 border-white/10 group-hover:border-orange-500/50 transition-colors duration-500">
                                            <AvatarImage src={expert.photoUrl} className="object-cover" />
                                            <AvatarFallback className="bg-orange-500/10 text-orange-500 text-3xl font-black">
                                                {expert.firstName[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        {expert.verified && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 p-1.5 rounded-full border-4 border-[#1a1c23]">
                                                <UserCheck className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-black text-white text-xl line-clamp-1 mb-1 tracking-tight">{expert.firstName} {expert.lastName}</p>
                                    <p className="text-[11px] text-[#8a92a6] uppercase tracking-[0.15em] font-black mb-8 line-clamp-1 h-4">{expert.profession || expert.role}</p>
                                    <Button 
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm h-12 shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                                        onClick={() => handleToggleFollow(expert.id, false)}
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" /> Follow
                                    </Button>
                                </Card>
                            ))}
                            {suggestedExperts.length === 0 && (
                                <div className="w-full flex flex-col items-center justify-center py-16 bg-white/5 rounded-[2rem] border-4 border-dashed border-white/5">
                                    <Users className="h-16 w-16 text-muted-foreground opacity-10 mb-4" />
                                    <p className="text-lg text-muted-foreground font-black opacity-40">No verified suggestions match your search.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-4 px-2">
                            <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <div className="flex-1 mx-8 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div className="absolute left-[30%] top-0 bottom-0 w-[40%] bg-white/30 rounded-full" />
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <Card className="border-none bg-[#24262d] rounded-2xl overflow-hidden shadow-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="text-2xl font-black text-white">My Network</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Manage your groups and connections.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs defaultValue="my-groups" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 h-12 rounded-xl mb-8">
                            <TabsTrigger value="my-groups" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
                                My Groups
                            </TabsTrigger>
                            <TabsTrigger value="followers" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
                                Followers
                                <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none font-bold text-[10px]">{myFollowers?.length || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="following" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
                                Following
                                <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none font-bold text-[10px]">{userProfile?.following?.length || 0}</Badge>
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="my-groups" className="space-y-4">
                            {isMyGroupsLoading ? (
                                <div className="flex justify-center p-8"><Loader className="animate-spin h-8 w-8 text-orange-500" /></div>
                            ) : myGroups && myGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myGroups.map(group => (
                                        <Link key={group.id} href={`/groups/${group.id}`}>
                                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-black text-white text-lg group-hover:text-orange-500 transition-colors">{group.name}</h4>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                                            {group.members?.length || 0} Professional{group.members?.length !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-all" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white/5 rounded-3xl border-4 border-dashed border-white/5">
                                    <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-10" />
                                    <p className="text-muted-foreground font-bold">You haven't joined any groups yet.</p>
                                    <Button variant="link" asChild className="mt-2 text-orange-500 font-black uppercase tracking-wider text-xs">
                                        <Link href="/groups">Explore Groups Now</Link>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="followers">
                            <UserList userIdsQuery={followersQuery} emptyStateMessage="No one is following you yet. Try sharing some posts to increase your visibility!" />
                        </TabsContent>

                        <TabsContent value="following">
                            <UserList userIds={userProfile?.following || []} emptyStateMessage="You aren't following any experts yet. Start following people from the 'Suggestions' section!" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed" className="mt-6 space-y-6">
            {!showPostForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rss className="h-5 w-5 text-primary" />
                    Engage with the Community
                  </CardTitle>
                  <CardDescription>
                    Share updates, ask questions, and connect with other professionals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1" size="lg">
                    <Link href="/feed">View Public Feed</Link>
                  </Button>
                  <Button variant="secondary" className="flex-1" size="lg" onClick={() => setShowPostForm(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Publish Update</CardTitle>
                    <CardDescription>Share your recent work or news with the community.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPostForm(false)}>Cancel</Button>
                </CardHeader>
                <CardContent>
                  <PostForm form={postForm} onSubmit={onPostSubmit} isSubmitting={isSubmittingPost} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <Card className="border-none bg-[#24262d]">
              <CardHeader>
                <CardTitle className="text-2xl font-black">Manage Your Plan</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upgrade your plan to unlock powerful new features and increase your visibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div className={cn(
                  "relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all",
                  (userProfile.tier === 'Standard' || !userProfile.tier) 
                    ? "border-orange-500 bg-orange-500/5" 
                    : "border-white/5 bg-[#1a1c23]"
                )}>
                  <div className="bg-white/5 p-4 rounded-full mb-4">
                    <UserIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-black mb-1">Standard</h3>
                  <p className="text-xs text-muted-foreground mb-6">Your current free plan.</p>
                  
                  <ul className="w-full space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> Public profile listing
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> Appear in search results
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> Earn referral points
                    </li>
                  </ul>

                  {(userProfile.tier === 'Standard' || !userProfile.tier) ? (
                    <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground border-none">
                      <CheckCircle className="mr-2 h-4 w-4" /> Current Plan
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5" asChild>
                      <Link href="/dashboard">Switch to Standard</Link>
                    </Button>
                  )}
                </div>

                <div className={cn(
                  "relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all",
                  userProfile.tier === 'Premier' 
                    ? "border-orange-500 bg-orange-500/5" 
                    : "border-white/5 bg-[#1a1c23]"
                )}>
                  <div className="bg-white/5 p-4 rounded-full mb-4">
                    <Crown className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-1">Premier</h3>
                  <p className="text-xs text-muted-foreground mb-6">Enhanced visibility and features.</p>
                  
                  <ul className="w-full space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> Higher search ranking
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> AI-powered bio & skill suggestions
                    </li>
                  </ul>

                  {userProfile.tier === 'Premier' ? (
                    <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground border-none">
                      <CheckCircle className="mr-2 h-4 w-4" /> Current Plan
                    </Button>
                  ) : (
                    <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold" asChild>
                      <Link href="/payment/premier">
                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade to Premier
                      </Link>
                    </Button>
                  )}
                </div>

                <div className={cn(
                  "relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all",
                  userProfile.tier === 'Super Premier' 
                    ? "border-orange-500 bg-orange-500/5" 
                    : "border-white/5 bg-[#1a1c23]"
                )}>
                  <div className="bg-white/5 p-4 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-1">Super Premier</h3>
                  <p className="text-xs text-muted-foreground mb-6">Maximum visibility and tools.</p>
                  
                  <ul className="w-full space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> All Premier features
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> Top placement in search results
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-4 w-4 text-green-500" /> AI-powered search access
                    </li>
                  </ul>

                  {userProfile.tier === 'Super Premier' ? (
                    <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground border-none">
                      <CheckCircle className="mr-2 h-4 w-4" /> Current Plan
                    </Button>
                  ) : (
                    <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold" asChild>
                      <Link href="/payment/super-premier">
                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade to Super Premier
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hide Profile Dialog */}
      <Dialog open={isHideDialogOpen} onOpenChange={setIsHideDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl border-none bg-[#1a1c23] text-white">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                      <EyeOff className="text-orange-500" />
                      Temporary Hide
                  </DialogTitle>
                  <UiDialogDescription className="text-muted-foreground">
                      Hide your profile card from all public search results and the home page for a chosen period. It will automatically reappear once the time is up.
                  </UiDialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-6">
                  <Button variant="secondary" className="h-12 font-bold" onClick={() => handleHideProfile(1)}>1 Hour</Button>
                  <Button variant="secondary" className="h-12 font-bold" onClick={() => handleHideProfile(24)}>1 Day</Button>
                  <Button variant="secondary" className="h-12 font-bold" onClick={() => handleHideProfile(72)}>3 Days</Button>
                  <Button variant="secondary" className="h-12 font-bold" onClick={() => handleHideProfile(168)}>1 Week</Button>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsHideDialogOpen(false)} className="text-white hover:bg-white/5">Cancel</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Your Professional Profile</DialogTitle></DialogHeader>
          {userProfile && <EditProfileForm userProfile={userProfile as any} onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <ProfileCompletionWizard 
        isOpen={isWizardOpen} 
        onOpenChange={setIsWizardOpen} 
        userProfile={userProfile} 
      />
    </div>
  );
}
