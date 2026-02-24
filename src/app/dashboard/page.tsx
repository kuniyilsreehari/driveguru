
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, orderBy, query, where, limit, arrayUnion, arrayRemove, doc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Loader, Edit, UserCheck, User as UserIcon, MessageSquare, Gift, Info, Book, Pen, PlusCircle, MapPin, IndianRupee, Calendar, GraduationCap, School, Building, Home, Share2, Rss, UserPlus, Users, Link as LinkIcon, Search, AlertCircle, Check, CheckCircle, ArrowUpCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Crown, Sparkles, Eye, EyeOff, Clock, Briefcase, Trash2, MoreHorizontal } from 'lucide-react';
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
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDistanceToNow } from 'date-fns';
import type { Vacancy } from '@/app/vacancies/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const MAX_VACANCIES = 2;

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
  const [isVacancyDialogOpen, setIsVacancyDialogOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);

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

  const myVacanciesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'vacancies'), where('companyId', '==', user.uid), orderBy('postedAt', 'desc'));
  }, [firestore, user]);
  const { data: myVacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(myVacanciesQuery);

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

  const handleDeleteVacancy = async (vacancyId: string) => {
    const vacancyRef = doc(firestore, 'vacancies', vacancyId);
    try {
        await deleteDocumentNonBlocking(vacancyRef);
        toast({ title: "Vacancy Deleted" });
    } catch (e) {
        toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin text-orange-500" /></div>;
  if (!user || !userProfile) return null;

  const isHidden = userProfile.hiddenUntil && userProfile.hiddenUntil.toDate() > new Date();
  const canManageJobs = userProfile.role === 'Company' || userProfile.role === 'Authorized Pro';
  const vacancyLimitReached = (myVacancies?.length || 0) >= MAX_VACANCIES;

  return (
    <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4 border-b border-white/5 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">Expert Dashboard</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your professional presence and network.</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl border-2 border-white/10 bg-transparent text-white hover:bg-white/5 font-bold h-12" 
            onClick={() => auth && signOut(auth).then(() => router.push('/'))}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full bg-white/5 p-1 h-14 rounded-2xl mb-8">
            <TabsTrigger value="overview" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">Overview</TabsTrigger>
            <TabsTrigger value="network" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">My Network</TabsTrigger>
            {canManageJobs && (
                <TabsTrigger value="jobs" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">My Jobs</TabsTrigger>
            )}
            <TabsTrigger value="feed" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">Feed</TabsTrigger>
            <TabsTrigger value="plans" className="flex-1 rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all">My Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-8">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
              <Collapsible open={isProfileExpanded} onOpenChange={setIsProfileExpanded}>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 bg-white/5 border-b border-white/5">
                  <Avatar className="h-24 w-24 border-4 border-orange-500/20 cursor-pointer hover:border-orange-500/50 transition-all" onClick={() => setIsEditDialogOpen(true)}>
                    <AvatarImage src={userProfile.photoUrl} className="object-cover" />
                    <AvatarFallback className="text-[10px] text-center px-2 font-bold leading-tight bg-orange-500/10 text-orange-500">change image</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-white tracking-tight">{userProfile.companyName || userProfile.firstName}!</h2>
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
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-orange-500" /> {myFollowers?.length || 0} Followers</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-orange-500" /> {userProfile.following?.length || 0} Following</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {userProfile.verified && <Badge className="bg-green-500 text-white border-none font-black text-[10px] uppercase h-6 px-3"><UserCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
                      {userProfile.tier === 'Super Premier' && <Badge className="bg-blue-600 text-white border-none font-black text-[10px] uppercase h-6 px-3 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Super Premier</Badge>}
                      {userProfile.tier === 'Premier' && <Badge className="bg-purple-600 text-white border-none font-black text-[10px] uppercase h-6 px-3 flex items-center gap-1"><Crown className="h-3 w-3" /> Premier</Badge>}
                      <Badge variant="secondary" className="font-bold bg-white/10 text-white border-none text-[10px] uppercase">{userProfile.role}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                      <Button onClick={() => setIsEditDialogOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl h-12 shadow-lg shadow-orange-500/20">
                          <Edit className="mr-2 h-4 w-4" /> Edit Profile
                      </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Availability Toggle */}
                      <div className="bg-white/5 p-5 rounded-2xl flex items-center justify-between border border-white/5">
                          <div className="flex items-center gap-3">
                              <Switch 
                                  checked={userProfile.isAvailable} 
                                  onCheckedChange={(v) => updateDocumentNonBlocking(userDocRef!, { isAvailable: v })} 
                                  className="data-[state=checked]:bg-green-500"
                              />
                              <div>
                                <p className="font-black text-sm text-white">Available for Work</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Toggle your hiring status.</p>
                              </div>
                          </div>
                          {userProfile.isAvailable ? <CheckCircle className="text-green-500 h-5 w-5" /> : <Clock className="text-muted-foreground h-5 w-5 opacity-30" />}
                      </div>

                      {/* Visibility Control */}
                      <div className={cn("p-5 rounded-2xl flex items-center justify-between transition-colors border", isHidden ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/5")}>
                          <div className="flex items-center gap-3">
                              {isHidden ? <EyeOff className="text-orange-500 h-5 w-5" /> : <Eye className="text-muted-foreground h-5 w-5" />}
                              <div>
                                <p className="font-black text-sm text-white">Profile Visibility</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {isHidden 
                                        ? `Hidden until ${formatDistanceToNow(userProfile.hiddenUntil!.toDate(), { addSuffix: true })}` 
                                        : "Your profile is public."
                                    }
                                </p>
                              </div>
                          </div>
                          {isHidden ? (
                              <Button size="sm" variant="ghost" onClick={handleUnhideProfile} className="h-8 font-black text-[10px] uppercase text-orange-500 hover:text-orange-400 hover:bg-orange-500/5">Unhide Now</Button>
                          ) : (
                              <Button size="sm" variant="outline" onClick={() => setIsHideDialogOpen(true)} className="h-8 font-black text-[10px] uppercase border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white">Temp Hide</Button>
                          )}
                      </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-primary">Profile Completion</span>
                      <span className="text-xl font-black text-white">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-3 bg-white/5" />
                  </div>

                  {profileCompletion < 100 && (
                      <div className="bg-orange-500/5 border-2 border-dashed border-orange-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4 text-center sm:text-left">
                              <div className="bg-orange-500/10 p-3 rounded-xl">
                                <AlertCircle className="h-6 w-6 text-orange-500" />
                              </div>
                              <div>
                                  <p className="font-black text-white">Complete Your Profile!</p>
                                  <p className="text-xs text-muted-foreground font-medium mt-1">A complete profile receives 5x more clicks from clients.</p>
                              </div>
                          </div>
                          <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto bg-white text-black hover:bg-white/90 font-black rounded-xl h-11 px-6">
                            Fix Missing Details
                          </Button>
                      </div>
                  )}

                  <CollapsibleContent className="space-y-6 pt-6 border-t border-white/5 transition-all duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                        <div className="flex items-center gap-3 text-sm">
                            <UserIcon className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Gender</span>
                            <span className={cn("text-white font-bold", !userProfile.gender && "text-red-500/50")}>{userProfile.gender || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <IndianRupee className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Rate</span>
                            <span className={cn("text-white font-bold", !userProfile.pricingValue && "text-red-500/50")}>{userProfile.pricingValue ? `₹${userProfile.pricingValue} / ${userProfile.pricingModel || 'hr'}` : 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Experience</span>
                            <span className={cn("text-white font-bold", !userProfile.experienceYears && "text-red-500/50")}>{userProfile.experienceYears ? `${userProfile.experienceYears} years` : 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Location</span>
                            <span className={cn("text-white font-bold", !userProfile.city && !userProfile.state && !userProfile.pincode && "text-red-500/50")}>{[userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ') || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <GraduationCap className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Qualification</span>
                            <span className={cn("text-white font-bold", !userProfile.qualification && "text-red-500/50")}>{userProfile.qualification || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <School className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">College</span>
                            <span className={cn("text-white font-bold", !userProfile.collegeName && "text-red-500/50")}>{userProfile.collegeName || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Building className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Business</span>
                            <span className={cn("text-white font-bold", !userProfile.companyName && "text-red-500/50")}>{userProfile.companyName || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Home className="h-4 w-4 text-orange-500" />
                            <span className="font-black text-muted-foreground uppercase tracking-widest text-[10px] w-24">Address</span>
                            <span className={cn("text-white font-bold truncate", !userProfile.address && "text-red-500/50")}>{userProfile.address || 'Not specified'}</span>
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-8">
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3"><Info className="h-4 w-4" /> About Me</h4>
                            <p className={cn("text-sm font-medium leading-relaxed", !userProfile.aboutMe ? "text-red-500/50" : "text-white/70")}>
                              {userProfile.aboutMe || 'No information provided.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3"><Pen className="h-4 w-4" /> About My Dream</h4>
                            <p className={cn("text-sm font-medium leading-relaxed", !userProfile.aboutYourDream ? "text-red-500/50" : "text-white/70")}>
                              {userProfile.aboutYourDream || 'No information provided.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3"><Building className="h-4 w-4" /> Associated Projects</h4>
                            <p className={cn("text-sm font-medium leading-relaxed", !userProfile.associatedProjectsName ? "text-red-500/50" : "text-white/70")}>
                              {userProfile.associatedProjectsName || 'No projects listed.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2 mb-3"><Book className="h-4 w-4" /> Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {userProfile.skills ? userProfile.skills.split(',').map((s, i) => (
                                    <Badge key={i} variant="secondary" className="bg-white/10 text-white border-none font-bold text-xs px-3 py-1 rounded-lg">{s.trim()}</Badge>
                                )) : <span className="text-xs text-red-500/50 font-bold">No skills listed.</span>}
                            </div>
                        </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>

            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-white">
                        <Gift className="h-6 w-6 text-orange-500" /> Referral Rewards
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Invite colleagues and earn premium points.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Your Professional Code</p>
                            <p className="text-3xl font-black font-mono tracking-[0.2em] text-orange-500">{userProfile.referralCode || 'N/A'}</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button variant="outline" size="lg" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userProfile.referralCode}`); toast({ title: "Copied!" }); }} className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 font-bold">
                                <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                            </Button>
                            <Button variant="outline" size="lg" className="bg-green-600/10 text-green-500 border-green-600/20 hover:bg-green-600 hover:text-white flex-1 rounded-xl font-bold" onClick={() => window.open(`https://wa.me/?text=Join me on DriveGuru using my referral code: ${userProfile.referralCode}`, '_blank')}>
                                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
                            <p className="text-4xl font-black text-orange-500 mb-1">{userProfile.referralPoints || 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Premium Points</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
                            <p className="text-4xl font-black text-white mb-1">{myReferrals?.length || 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Referrals</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-0">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                    <CardTitle className="text-2xl font-black text-white">My Network</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Manage your groups and connections.</CardDescription>
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
                                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-black text-white text-lg group-hover:text-orange-500 transition-colors">{group.name}</h4>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{group.members?.length || 0} Professional{group.members?.length !== 1 ? 's' : ''}</p>
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

                        <TabsContent value="followers" className="mt-0">
                            <UserList userIdsQuery={followersQuery} emptyStateMessage="No one is following you yet. Try sharing some posts to increase your visibility!" />
                        </TabsContent>

                        <TabsContent value="following" className="mt-0">
                            <UserList userIds={userProfile?.following || []} emptyStateMessage="You aren't following any experts yet." />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </TabsContent>

          {canManageJobs && (
            <TabsContent value="jobs" className="mt-0">
                <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                                    <Briefcase className="h-6 w-6 text-orange-500" /> Vacancy Management
                                </CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">Post and manage job openings for your company.</CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Button 
                                    onClick={() => { setSelectedVacancy(null); setIsVacancyDialogOpen(true); }} 
                                    className="rounded-xl font-black bg-orange-500 hover:bg-orange-600 h-12 px-6 shadow-lg shadow-orange-500/20"
                                    disabled={vacancyLimitReached}
                                >
                                    <PlusCircle className="mr-2 h-5 w-5" /> Post New Job
                                </Button>
                                {vacancyLimitReached && (
                                    <Badge variant="outline" className="border-orange-500/50 bg-orange-500/5 text-orange-500 font-bold text-[10px] uppercase h-6">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Max 2 Posts Reached
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="w-[60px] font-bold text-white text-center">S.No</TableHead>
                                    <TableHead className="font-bold text-white">Job Title</TableHead>
                                    <TableHead className="font-bold text-white">Location</TableHead>
                                    <TableHead className="font-bold text-white text-center">Type</TableHead>
                                    <TableHead className="font-bold text-white">Posted</TableHead>
                                    <TableHead className="text-right font-bold text-white pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isVacanciesLoading ? (
                                    <TableRow className="border-none"><TableCell colSpan={6} className="text-center py-12"><Loader className="animate-spin mx-auto text-orange-500" /></TableCell></TableRow>
                                ) : !myVacancies || myVacancies.length === 0 ? (
                                    <TableRow className="border-none"><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-medium">You haven't posted any jobs yet.</TableCell></TableRow>
                                ) : (
                                    myVacancies.map((v, index) => (
                                        <TableRow key={v.id} className="hover:bg-white/5 transition-colors border-white/5 h-20">
                                            <TableCell className="text-center font-bold text-muted-foreground text-xs">{index + 1}</TableCell>
                                            <TableCell className="font-black text-white">{v.title}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{v.location}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="bg-white/10 text-white border-none font-bold text-[10px] uppercase h-6">{v.employmentType}</Badge>
                                            </TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground font-bold">
                                                {v.postedAt ? formatDistanceToNow(v.postedAt.toDate(), { addSuffix: true }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-2 border-white/10 bg-[#1a1c23] text-white">
                                                        <DropdownMenuItem onClick={() => { setSelectedVacancy(v); setIsVacancyDialogOpen(true); }} className="rounded-lg focus:bg-white/5 focus:text-white font-bold"><Edit className="mr-2 h-4 w-4" /> Edit Job</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteVacancy(v.id)} className="text-red-500 focus:text-red-500 rounded-lg focus:bg-red-500/5 font-bold"><Trash2 className="mr-2 h-4 w-4" /> Delete Job</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
          )}

          <TabsContent value="feed" className="mt-0 space-y-6">
            {!showPostForm ? (
              <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-white">
                    <Rss className="h-6 w-6 text-orange-500" /> Engage with the Community
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-medium">Share updates, ask questions, and connect with other professionals.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1 bg-white text-black hover:bg-white/90 font-black rounded-2xl h-14 text-lg" size="lg">
                    <Link href="/feed">View Public Feed</Link>
                  </Button>
                  <Button variant="secondary" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl h-14 text-lg border-none" size="lg" onClick={() => setShowPostForm(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="flex flex-row items-center justify-between bg-white/5 border-b border-white/5 p-6">
                  <div>
                    <CardTitle className="text-2xl font-black text-white">Publish Update</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Share your recent work or news with the community.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPostForm(false)} className="rounded-xl hover:bg-white/10">Cancel</Button>
                </CardHeader>
                <CardContent className="p-8">
                  <PostForm form={postForm} onSubmit={onPostSubmit} isSubmitting={isSubmittingPost} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <Card className="border-none bg-[#24262d] rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                <CardTitle className="text-2xl font-black text-white">Upgrade Your Presence</CardTitle>
                <CardDescription className="text-muted-foreground font-medium">Unlock powerful tools and increase your visibility to clients.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", (userProfile.tier === 'Standard' || !userProfile.tier) ? "border-orange-500 bg-orange-500/5 shadow-2xl" : "border-white/5 bg-[#1a1c23] opacity-60")}>
                  <div className="bg-white/5 p-4 rounded-full mb-4"><UserIcon className="h-8 w-8 text-muted-foreground" /></div>
                  <h3 className="text-2xl font-black text-white mb-1">Standard</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8">Basic Profile</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Public profile listing</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Appear in search results</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Earn referral points</li>
                  </ul>
                  {(userProfile.tier === 'Standard' || !userProfile.tier) ? <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]"><CheckCircle className="mr-2 h-4 w-4" /> Active Plan</Button> : <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 font-black uppercase tracking-widest text-[10px]" asChild><Link href="/dashboard">Active</Link></Button>}
                </div>
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", userProfile.tier === 'Premier' ? "border-orange-500 bg-orange-500/5 shadow-2xl" : "border-white/5 bg-[#1a1c23]")}>
                  <div className="bg-orange-500/10 p-4 rounded-full mb-4"><Crown className="h-8 w-8 text-orange-500" /></div>
                  <h3 className="text-2xl font-black text-white mb-1">Premier</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-8">Power User</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Higher search ranking</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> AI-powered bio creation</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Advanced skill tagging</li>
                  </ul>
                  {userProfile.tier === 'Premier' ? <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]"><CheckCircle className="mr-2 h-4 w-4" /> Active Plan</Button> : <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black uppercase tracking-widest text-[10px]" asChild><Link href="/payment/premier">Upgrade Now</Link></Button>}
                </div>
                <div className={cn("relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-500", userProfile.tier === 'Super Premier' ? "border-orange-500 bg-orange-500/5 shadow-2xl" : "border-white/5 bg-[#1a1c23]")}>
                  <div className="bg-blue-500/10 p-4 rounded-full mb-4"><Sparkles className="h-8 w-8 text-blue-500" /></div>
                  <h3 className="text-2xl font-black text-white mb-1">Super</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">Ultimate Access</p>
                  <ul className="w-full space-y-4 mb-10">
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> All Premier features</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Exclusive AI Search access</li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/70"><Check className="h-4 w-4 text-green-500" /> Verified blue badge</li>
                  </ul>
                  {userProfile.tier === 'Super Premier' ? <Button disabled className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]"><CheckCircle className="mr-2 h-4 w-4" /> Active Plan</Button> : <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-[10px]" asChild><Link href="/payment/super-premier">Go Super</Link></Button>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Vacancy Dialog */}
      <Dialog open={isVacancyDialogOpen} onOpenChange={setIsVacancyDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-[#1a1c23] text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black">{selectedVacancy ? 'Edit Job Opening' : 'Post New Job'}</DialogTitle></DialogHeader>
          <PostVacancyForm 
            onSuccess={() => setIsVacancyDialogOpen(false)} 
            companyId={user.uid}
            companyName={userProfile.companyName}
            companyEmail={userProfile.email || ''}
            contactPhone={userProfile.phoneNumber}
            vacancy={selectedVacancy || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Hide Profile Dialog */}
      <Dialog open={isHideDialogOpen} onOpenChange={setIsHideDialogOpen}>
          <DialogContent className="max-w-md rounded-[2rem] border-none bg-[#1a1c23] text-white p-8">
              <DialogHeader className="items-center text-center">
                  <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4">
                    <EyeOff className="text-orange-500 h-10 w-10" />
                  </div>
                  <DialogTitle className="text-3xl font-black">Temporary Hide</DialogTitle>
                  <UiDialogDescription className="text-muted-foreground font-medium pt-2">Hide your profile card from all public search results instantly.</UiDialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-8">
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10" onClick={() => handleHideProfile(1)}>1 Hour</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10" onClick={() => handleHideProfile(24)}>1 Day</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10" onClick={() => handleHideProfile(72)}>3 Days</Button>
                  <Button variant="secondary" className="h-14 font-black rounded-xl border border-white/5 bg-white/5 hover:bg-white/10" onClick={() => handleHideProfile(168)}>1 Week</Button>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setIsHideDialogOpen(false)} className="w-full h-12 rounded-xl text-muted-foreground hover:text-white font-bold">Nevermind</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[2rem] border-none bg-[#1a1c23]">
          <DialogHeader><DialogTitle className="text-2xl font-black text-white">Edit Your Professional Profile</DialogTitle></DialogHeader>
          <div className="p-4">{userProfile && <EditProfileForm userProfile={userProfile as any} onSuccess={() => setIsEditDialogOpen(false)} />}</div>
        </DialogContent>
      </Dialog>

      <ProfileCompletionWizard isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} userProfile={userProfile} />
    </div>
  );
}
