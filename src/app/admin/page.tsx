
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection, setDocumentNonBlocking } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, ThumbsUp, ThumbsDown, Star, Search, PlusCircle } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Vacancy } from '@/app/vacancies/page';

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    role?: 'Super Admin' | 'Freelancer' | 'Company' | 'Authorized Pro';
    createdAt?: Timestamp;
};

type Review = {
    id: string;
    expertId: string;
    expertName: string;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
};

type AppConfig = {
    featuredExpertsLimit?: number;
};

const UserTable = ({ users, onTierChange, onVerificationToggle, onDelete }: { users: ExpertUser[], onTierChange: (expert: ExpertUser, tier: ExpertUser['tier']) => void, onVerificationToggle: (expert: ExpertUser) => void, onDelete: (expert: ExpertUser) => void }) => {
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
    
    const { toast } = useToast();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
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
                    <TableCell>
                        <div className="font-medium">{expert.firstName} {expert.lastName}</div>
                        {expert.createdAt && (
                            <div className="text-xs text-muted-foreground">
                                {format(expert.createdAt.toDate(), 'PPP')}
                            </div>
                        )}
                    </TableCell>
                    <TableCell>{expert.email}</TableCell>
                    <TableCell><Badge variant="secondary">{expert.role}</Badge></TableCell>
                    <TableCell className="text-center">{renderTierBadge(expert.tier)}</TableCell>
                    <TableCell className="text-center">
                        <div className='flex items-center justify-center space-x-2'>
                            <Switch id={`verified-switch-${expert.id}`} checked={expert.verified || false} onCheckedChange={() => onVerificationToggle(expert)} />
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
                                        <DropdownMenuItem onClick={() => onTierChange(expert, 'Standard')}><UserIcon className="mr-2 h-4 w-4" />Standard</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onTierChange(expert, 'Premier')}><Crown className="mr-2 h-4 w-4" />Premier</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onTierChange(expert, 'Super Premier')}><Sparkles className="mr-2 h-4 w-4" />Super Premier</DropdownMenuItem>
                                    </DropdownMenuSubContent></DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={() => toast({ title: "Edit clicked", description: "Edit functionality coming soon!"})}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(expert)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : ( <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No users found for this role.</TableCell></TableRow> )}
            </TableBody>
        </Table>
    )
}

const ReviewTable = ({ reviews, onApprove, onReject }: { reviews: Review[], onApprove: (review: Review) => void, onReject: (review: Review) => void }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Expert</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {reviews && reviews.length > 0 ? (
                    reviews.map((review) => (
                        <TableRow key={review.id}>
                            <TableCell className="font-medium">
                                <Link href={`/expert/${review.expertId}`} className="hover:underline">{review.expertName}</Link>
                            </TableCell>
                            <TableCell>{review.reviewerName}</TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    {review.rating} <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                            <TableCell>{review.createdAt ? formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true }) : 'pending...'}</TableCell>
                            <TableCell className="text-right">
                                {review.status === 'pending' ? (
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => onApprove(review)}><ThumbsUp className="mr-2 h-4 w-4" />Approve</Button>
                                        <Button variant="destructive" size="sm" onClick={() => onReject(review)}><ThumbsDown className="mr-2 h-4 w-4" />Reject</Button>
                                    </div>
                                ) : (
                                    <Badge variant={review.status === 'approved' ? 'outline' : 'destructive'} className={review.status === 'approved' ? 'border-green-500 text-green-500' : ''}>
                                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No reviews found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    )
}

const VacancyTable = ({ vacancies, onDelete }: { vacancies: Vacancy[], onDelete: (vacancy: Vacancy) => void }) => {
  return (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {vacancies && vacancies.length > 0 ? (
                  vacancies.map((vacancy) => (
                      <TableRow key={vacancy.id}>
                          <TableCell className="font-medium">{vacancy.title}</TableCell>
                          <TableCell>{vacancy.companyName}</TableCell>
                          <TableCell>{vacancy.location}</TableCell>
                          <TableCell><Badge variant="secondary">{vacancy.employmentType}</Badge></TableCell>
                          <TableCell>{vacancy.postedAt ? formatDistanceToNow(vacancy.postedAt.toDate(), { addSuffix: true }) : 'pending...'}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="destructive" size="sm" onClick={() => onDelete(vacancy)}>
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No vacancies found.</TableCell></TableRow>
              )}
          </TableBody>
      </Table>
  );
}


export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReviewRejectDialogOpen, setIsReviewRejectDialogOpen] = useState(false);
  const [isVacancyDeleteDialogOpen, setIsVacancyDeleteDialogOpen] = useState(false);
  const [isVacancyPostDialogOpen, setIsVacancyPostDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [featuredExpertsLimit, setFeaturedExpertsLimit] = useState(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);


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

  const reviewsCollectionQuery = useMemoFirebase(() => {
      if (!firestore || !isSuperAdmin) return null;
      return query(collection(firestore, 'reviews'), orderBy('createdAt', 'desc'));
  }, [firestore, isSuperAdmin]);

  const vacanciesCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc'));
  }, [firestore, isSuperAdmin]);


  const { data: users, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersCollectionRef);
  const { data: reviews, isLoading: isReviewsLoading } = useCollection<Review>(reviewsCollectionQuery);
  const { data: vacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(vacanciesCollectionQuery);
  
  const appConfigDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
  
  useEffect(() => {
    if (!isAppConfigLoading) {
      if (appConfig?.featuredExpertsLimit) {
        setFeaturedExpertsLimit(appConfig.featuredExpertsLimit);
      } else if (appConfig === null && appConfigDocRef) {
        setDocumentNonBlocking(appConfigDocRef, { featuredExpertsLimit: 3 }, { merge: true });
      }
    }
  }, [appConfig, isAppConfigLoading, appConfigDocRef]);


  const verifiedCount = users?.filter(u => u.verified).length || 0;
  const unverifiedCount = users?.filter(u => !u.verified).length || 0;
  const premierCount = users?.filter(u => u.tier === 'Premier').length || 0;
  const superPremierCount = users?.filter(u => u.tier === 'Super Premier').length || 0;


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

  const handleApproveReview = (review: Review) => {
    if (!firestore) return;
    const reviewDocRef = doc(firestore, 'reviews', review.id);
    updateDocumentNonBlocking(reviewDocRef, { status: 'approved' });
    toast({
      title: "Review Approved",
      description: `The review for ${review.expertName} is now public.`,
    });
  };

  const openReviewRejectDialog = (review: Review) => {
    setSelectedReview(review);
    setIsReviewRejectDialogOpen(true);
  };

  const handleRejectReview = () => {
    if (!selectedReview || !firestore) return;
    const reviewDocRef = doc(firestore, 'reviews', selectedReview.id);
    updateDocumentNonBlocking(reviewDocRef, { status: 'rejected' });
    toast({
      title: "Review Rejected",
      description: "The review has been marked as rejected.",
      variant: 'destructive'
    });
    setIsReviewRejectDialogOpen(false);
    setSelectedReview(null);
  };

  const openVacancyDeleteDialog = (vacancy: Vacancy) => {
      setSelectedVacancy(vacancy);
      setIsVacancyDeleteDialogOpen(true);
  };

  const handleDeleteVacancy = () => {
      if (!selectedVacancy || !firestore) return;
      const vacancyDocRef = doc(firestore, 'vacancies', selectedVacancy.id);
      deleteDocumentNonBlocking(vacancyDocRef);
      toast({
          title: "Vacancy Deleted",
          description: `The vacancy "${selectedVacancy.title}" has been removed.`,
      });
      setIsVacancyDeleteDialogOpen(false);
      setSelectedVacancy(null);
  };

  const handleFilterClick = (filter: string | null) => {
    if (activeFilter === filter) {
        setActiveFilter(null); // Toggle off if clicked again
    } else {
        setActiveFilter(filter);
    }
  };

  const isLoading = isUserLoading || isRoleLoading;
  const areTablesLoading = isSuperAdmin && (isUsersLoading || isReviewsLoading || isVacanciesLoading);
  
  const sortedUsers = users ? [...users].sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')) : [];

  const filteredUsers = sortedUsers.filter(user => {
      const searchMatch = searchQuery.length > 0 ? 
            (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             user.email?.toLowerCase().includes(searchQuery.toLowerCase())) 
          : true;

      const filterMatch = activeFilter ? {
          'verified': user.verified === true,
          'unverified': user.verified === false,
          'premier': user.tier === 'Premier',
          'super-premier': user.tier === 'Super Premier'
      }[activeFilter] : true;

      return searchMatch && filterMatch;
  });

  const freelancers = filteredUsers?.filter(user => user.role === 'Freelancer');
  const companies = filteredUsers?.filter(user => user.role === 'Company');
  const authorizedPros = filteredUsers?.filter(user => user.role === 'Authorized Pro');
  const superAdmins = filteredUsers?.filter(user => user.role === 'Super Admin');
  
  const pendingReviews = reviews?.filter(r => r.status === 'pending');
  const approvedReviews = reviews?.filter(r => r.status === 'approved');
  const rejectedReviews = reviews?.filter(r => r.status === 'rejected');


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
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
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
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
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
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Experts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total registered users</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified Experts</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Total verified experts</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unverified Experts</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{unverifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Pending verification</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Premier Experts</CardTitle>
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{premierCount}</div>
                  <p className="text-xs text-muted-foreground">Total Premier experts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Super Premier</CardTitle>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{superPremierCount}</div>
                  <p className="text-xs text-muted-foreground">Total Super Premier</p>
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
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
                      <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full sm:w-auto">
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

            <Tabs defaultValue="users">
              <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users">User Management</TabsTrigger>
                  <TabsTrigger value="reviews">Review Management</TabsTrigger>
                  <TabsTrigger value="vacancies">Vacancy Management</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6" />
                        <div>
                          <CardTitle>Expert Users</CardTitle>
                          <CardDescription>Manage all registered users in the system.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button variant={activeFilter === 'verified' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('verified')}>Verified</Button>
                                <Button variant={activeFilter === 'unverified' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('unverified')}>Unverified</Button>
                                <Button variant={activeFilter === 'premier' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('premier')}>Premier</Button>
                                <Button variant={activeFilter === 'super-premier' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('super-premier')}>Super Premier</Button>
                            </div>
                        </div>

                      {areTablesLoading ? (
                        <div className="flex justify-center items-center p-8">
                          <Loader className="h-6 w-6 animate-spin text-primary" />
                          <p className="ml-3 text-muted-foreground">Loading users...</p>
                        </div>
                      ) : (
                          <Tabs defaultValue="all">
                              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                  <TabsTrigger value="all">All Users</TabsTrigger>
                                  <TabsTrigger value="freelancers">Freelancers</TabsTrigger>
                                  <TabsTrigger value="companies">Companies</TabsTrigger>
                                  <TabsTrigger value="authorizedPros">Authorized Pros</TabsTrigger>
                                  <TabsTrigger value="superAdmins">Super Admins</TabsTrigger>
                              </TabsList>
                              <TabsContent value="all" className="mt-4">
                                  <UserTable users={filteredUsers} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} />
                              </TabsContent>
                              <TabsContent value="freelancers" className="mt-4">
                                  <UserTable users={freelancers || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} />
                              </TabsContent>
                              <TabsContent value="companies" className="mt-4">
                                  <UserTable users={companies || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} />
                              </TabsContent>
                              <TabsContent value="authorizedPros" className="mt-4">
                                  <UserTable users={authorizedPros || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} />
                              </TabsContent>
                              <TabsContent value="superAdmins" className="mt-4">
                                  <UserTable users={superAdmins || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} />
                              </TabsContent>
                          </Tabs>
                      )}
                    </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="reviews" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-6 w-6" />
                        <div>
                          <CardTitle>Review Moderation</CardTitle>
                          <CardDescription>Approve or reject reviews submitted by users.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                        {isReviewsLoading ? (
                             <div className="flex justify-center items-center p-8">
                                <Loader className="h-6 w-6 animate-spin text-primary" />
                                <p className="ml-3 text-muted-foreground">Loading reviews...</p>
                              </div>
                        ) : (
                            <Tabs defaultValue="pending">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="pending">Pending</TabsTrigger>
                                    <TabsTrigger value="approved">Approved</TabsTrigger>
                                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                                </TabsList>
                                <TabsContent value="pending" className="mt-4">
                                    <ReviewTable reviews={pendingReviews || []} onApprove={handleApproveReview} onReject={openReviewRejectDialog} />
                                </TabsContent>
                                <TabsContent value="approved" className="mt-4">
                                    <ReviewTable reviews={approvedReviews || []} onApprove={handleApproveReview} onReject={openReviewRejectDialog} />
                                </TabsContent>
                                 <TabsContent value="rejected" className="mt-4">
                                    <ReviewTable reviews={rejectedReviews || []} onApprove={handleApproveReview} onReject={openReviewRejectDialog} />
                                 </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="vacancies" className="mt-4">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-6 w-6" />
                            <div>
                              <CardTitle>Vacancy Management</CardTitle>
                              <CardDescription>Manage all job vacancies in the system.</CardDescription>
                            </div>
                          </div>
                          <Dialog open={isVacancyPostDialogOpen} onOpenChange={setIsVacancyPostDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Post New Vacancy
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Create a New Vacancy</DialogTitle>
                                <DialogDescription>As a Super Admin, you can post a job for any company.</DialogDescription>
                              </DialogHeader>
                              <PostVacancyForm
                                onSuccess={() => setIsVacancyPostDialogOpen(false)}
                                isAdmin={true}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isVacanciesLoading ? (
                             <div className="flex justify-center items-center p-8">
                                <Loader className="h-6 w-6 animate-spin text-primary" />
                                <p className="ml-3 text-muted-foreground">Loading vacancies...</p>
                              </div>
                        ) : (
                            <VacancyTable vacancies={vacancies || []} onDelete={openVacancyDeleteDialog} />
                        )}
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
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
      <AlertDialog open={isReviewRejectDialogOpen} onOpenChange={setIsReviewRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this review? This action can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectReview} className="bg-destructive hover:bg-destructive/90">
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isVacancyDeleteDialogOpen} onOpenChange={setIsVacancyDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vacancy?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the vacancy &quot;{selectedVacancy?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVacancy} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
