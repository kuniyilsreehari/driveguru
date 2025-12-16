
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, ThumbsUp, ThumbsDown, MessageSquare, Star } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

type Review = {
    id: string;
    expertId: string;
    expertName: string;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number; nanoseconds: number; }; // Firestore Timestamp structure
    status: 'pending' | 'approved' | 'rejected';
};

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);

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

  const reviewsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'reviews');
  }, [firestore, isSuperAdmin]);

  const { data: reviews, isLoading: isReviewsLoading } = useCollection<Review>(reviewsCollectionRef);

  const verifiedCount = users?.filter(u => u.verified).length || 0;
  const unverifiedCount = users?.filter(u => !u.verified).length || 0;
  const pendingReviewsCount = reviews?.filter(r => r.status === 'pending').length || 0;

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
  
  const handleReviewStatusChange = (review: Review, status: Review['status']) => {
    if(!firestore) return;
    const reviewDocRef = doc(firestore, 'reviews', review.id);
    updateDocumentNonBlocking(reviewDocRef, { status });
    toast({
      title: `Review ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `The review for ${review.expertName} has been ${status}.`
    })
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
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingReviewsCount}</div>
                  <p className="text-xs text-muted-foreground">Reviews awaiting your approval</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-8 lg:grid-cols-2">
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
                  {isUsersLoading ? (
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

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6" />
                    <div>
                      <CardTitle>Review Management</CardTitle>
                      <CardDescription>Approve or reject submitted reviews.</CardDescription>
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
                    <div className="space-y-4">
                      {reviews && reviews.length > 0 ? (
                        reviews.map(review => (
                          <div key={review.id} className="p-4 border rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold">{review.reviewerName} <span className="font-normal text-muted-foreground">on</span> {review.expertName}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true })}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={cn(
                                                "h-4 w-4",
                                                i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
                                            )}
                                        />
                                    ))}
                                </div>
                                <Badge variant={review.status === 'approved' ? 'default' : review.status === 'rejected' ? 'destructive' : 'secondary'}>{review.status}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">&quot;{review.comment}&quot;</p>
                            {review.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleReviewStatusChange(review, 'approved')}><ThumbsUp className="mr-2 h-4 w-4" />Approve</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleReviewStatusChange(review, 'rejected')}><ThumbsDown className="mr-2 h-4 w-4" />Reject</Button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No reviews submitted yet.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
