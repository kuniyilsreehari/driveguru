
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, getDoc, runTransaction, increment, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Briefcase, Loader, Edit, UserCheck, XCircle, MapPin, IndianRupee, Calendar, Book, GraduationCap, School, Info, User as UserIcon, Check, Power, Building, PlusCircle, Crown, Sparkles, Lock, Home, ArrowUpCircle, ShieldCheck, ExternalLink, Gift, Copy, Shield, AlertTriangle, ChevronDown, Link as LinkIcon, MessageCircle, BookOpen, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Vacancy } from '@/app/vacancies/page';
import Link from 'next/link';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { processReferral } from '@/ai/flows/process-referral-flow';
import { LogBookingForm } from '@/components/auth/log-booking-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    verified?: boolean;
    hourlyRate?: number;
    yearsOfExperience?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    phoneNumber?: string;
    companyName?: string;
    department?: string;
    isAvailable?: boolean;
    companyId?: string;
    referralCode?: string;
    referralPoints?: number;
    referredByCode?: string | null;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

type Booking = {
    id: string;
    expertId: string;
    clientName: string;
    clientContact: string;
    place: string;
    workDescription: string;
    bookingDate: Timestamp;
    status: 'confirmed' | 'completed' | 'cancelled';
    createdAt: Timestamp;
};

type PlanPrices = {
    daily?: number;
    monthly?: number;
    yearly?: number;
};

type AppConfig = {
    premierPlanPrices?: PlanPrices;
    superPremierPlanPrices?: PlanPrices;
    verificationFee?: number;
    referralRewardPoints?: number;
    verificationPaymentLink?: string;
    premierPaymentLink?: string;
    superPremierPaymentLink?: string;
};

function MyBookingsCard({ userProfile }: { userProfile: ExpertUserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'bookings'),
            where('expertId', '==', userProfile.id),
            orderBy('bookingDate', 'desc')
        );
    }, [firestore, userProfile]);

    const { data: bookings, isLoading: isBookingsLoading } = useCollection<Booking>(bookingsQuery);

    const isPremiumUser = userProfile.tier === 'Premier' || userProfile.tier === 'Super Premier';

    const handleUpdateStatus = (bookingId: string, status: 'completed' | 'cancelled') => {
        if (!firestore) return;
        const bookingDocRef = doc(firestore, 'bookings', bookingId);
        updateDocumentNonBlocking(bookingDocRef, { status });
        toast({
            title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            description: `The booking has been marked as ${status}.`,
        });
        if (bookingToCancel) {
            setBookingToCancel(null);
        }
    };
    
    if (!isPremiumUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Bookings</CardTitle>
                    <CardDescription>View and manage your client appointments.</CardDescription>
                </CardHeader>
                <CardContent className="text-center p-8 border-2 border-dashed rounded-lg m-6 mt-0">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <h3 className="font-semibold">This is a Premium Feature</h3>
                    <p className="text-sm text-muted-foreground mb-4">Upgrade your plan to manage appointments and track your schedule.</p>
                    <Button onClick={() => document.getElementById('plan-management')?.scrollIntoView({ behavior: 'smooth'})}>
                         <Crown className="mr-2 h-4 w-4"/> View Upgrade Options
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>A complete log of all your scheduled appointments.</CardDescription>
            </CardHeader>
            <CardContent>
                {isBookingsLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader className="mr-2 h-6 w-6 animate-spin" /> Loading your bookings...
                    </div>
                ) : bookings && bookings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell>
                                        <div className="font-medium">{booking.clientName}</div>
                                        <div className="text-xs text-muted-foreground">{booking.clientContact}</div>
                                    </TableCell>
                                    <TableCell>{booking.bookingDate ? format(booking.bookingDate.toDate(), 'PPp') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>{booking.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {booking.status === 'confirmed' && (
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(booking.id, 'completed')}>
                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Complete
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="destructive" onClick={() => setBookingToCancel(booking)}>
                                                            <XCircle className="mr-2 h-4 w-4"/> Cancel
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will cancel the booking with {bookingToCancel?.clientName}. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={() => setBookingToCancel(null)}>Back</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => bookingToCancel && handleUpdateStatus(bookingToCancel.id, 'cancelled')} className="bg-destructive hover:bg-destructive/90">
                                                                Yes, Cancel Booking
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">You have not logged any bookings yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function ExpertDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<ExpertUserProfile>(userDocRef);

  const appConfigDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
  
  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = superAdminData !== null;
  
  const referralsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.referralCode) return null;
    return query(collection(firestore, 'users'), where('referredByCode', '==', userProfile.referralCode));
  }, [firestore, userProfile?.referralCode]);

  const { data: referredUsers, isLoading: isReferralsLoading } = useCollection(referralsQuery);
  const referralCount = referredUsers?.length || 0;

  const totalPoints = useMemo(() => {
      if (isAppConfigLoading || !appConfig || !appConfig.referralRewardPoints) return userProfile?.referralPoints || 0;
      const pointsPerReferral = appConfig.referralRewardPoints;
      return referralCount * pointsPerReferral;
  }, [referralCount, userProfile?.referralPoints, appConfig, isAppConfigLoading]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && user && !isRoleLoading && isSuperAdmin && router.pathname !== '/admin') {
      router.push('/admin');
    }
  }, [user, isUserLoading, isRoleLoading, isSuperAdmin, router]);
  

  const handleLogout = () => {
    if (auth) {
        signOut(auth);
    }
  };

  const handleAvailabilityToggle = (isAvailable: boolean) => {
    if (!userDocRef) return;
    updateDocumentNonBlocking(userDocRef, { isAvailable });
    toast({
        title: "Availability Updated",
        description: `You are now set as ${isAvailable ? 'Available' : 'Unavailable'}.`,
    });
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  };

  const calculateProfileCompletion = (profile: ExpertUserProfile | null): number => {
    if (!profile) return 0;

    const fields = [
        profile.city,
        profile.state,
        profile.pincode,
        profile.phoneNumber,
        profile.hourlyRate,
        profile.yearsOfExperience,
        profile.gender,
        profile.qualification,
        profile.skills,
        profile.aboutMe,
        profile.photoUrl,
    ];
    
    if (profile.collegeName) fields.push(profile.collegeName);
    
    if (profile.role === 'Company' || profile.role === 'Authorized Pro') {
        fields.push(profile.companyName);
        fields.push(profile.department);
        fields.push(profile.address);
    }

    const filledFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;
    const totalFields = fields.length;
    
    return Math.round((filledFields / totalFields) * 100);
  }

  const copyReferralLink = () => {
    if (!userProfile?.referralCode) return;
    const baseUrl = window.location.origin;
    const signupUrl = new URL('/signup/role', baseUrl);
    signupUrl.searchParams.set('ref', userProfile.referralCode);
    navigator.clipboard.writeText(signupUrl.toString());
    toast({
      title: 'Referral Link Copied',
      description: 'Your unique signup link has been copied to your clipboard.',
    });
  };
  
  const shareOnWhatsApp = () => {
    if (!userProfile?.referralCode) return;
    const baseUrl = window.location.origin;
    const signupUrl = new URL('/signup/role', baseUrl);
    signupUrl.searchParams.set('ref', userProfile.referralCode);
    const text = `Join me on DriveGuru! Use my referral code to sign up: ${signupUrl.toString()}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAwardReferral = async (userToReward: ExpertUserProfile) => {
    if (!userToReward.referredByCode) {
      toast({
        variant: "destructive",
        title: "No Referral Code",
        description: "This user did not sign up with a referral code.",
      });
      return;
    }
  
    try {
      const result = await processReferral({
        newUserUid: userToReward.id,
        referralCode: userToReward.referredByCode
      });
  
      if (result.success) {
        toast({
          title: "Referral Points Awarded",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Failed to award referral points:", error);
      toast({
        variant: "destructive",
        title: "Award Failed",
        description: error.message || "Could not award points. Please check the referral code and try again.",
      });
    }
  };

  const profileCompletion = calculateProfileCompletion(userProfile);
  
  const isLoading = isUserLoading || isProfileLoading || isAppConfigLoading || isRoleLoading || isReferralsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Finalizing session...</p>
      </div>
    );
  }

  if (profileError) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-destructive">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl text-destructive">Error Loading Profile</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    <p>We couldn&apos;t load your dashboard. Please try again later or contact support.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user || !userProfile) {
    // This case should be rare due to the loading and error states above,
    // but it's a good fallback.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Finalizing session...</p>
      </div>
    );
  }
  
  const locationString = [userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ');
  const verificationFee = appConfig?.verificationFee;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 sm:h-24 sm:w-24 text-3xl">
                          <AvatarImage src={userProfile.photoUrl} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                          <AvatarFallback>{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl sm:text-4xl font-bold">Expert Dashboard</CardTitle>
                            <CardDescription>Welcome, {userProfile.firstName} {userProfile.lastName}.</CardDescription>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {userProfile.verified ? (
                                    <Badge variant="outline" className="border-green-500 text-green-500">
                                        <UserCheck className="mr-1 h-3 w-3" />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Not Verified
                                    </Badge>
                                )}
                                <Badge variant="secondary">{userProfile.role}</Badge>
                                {userProfile.companyName && <Badge variant="secondary">{userProfile.companyName}</Badge>}
                                {userProfile.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                {userProfile.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                            </div>
                            <div className="flex items-center space-x-2 mt-4">
                                <Switch 
                                    id="availability-mode" 
                                    checked={userProfile.isAvailable} 
                                    onCheckedChange={handleAvailabilityToggle}
                                    aria-label="Availability status"
                                />
                                <Label htmlFor="availability-mode" className="flex items-center gap-2 text-sm">
                                    {userProfile.isAvailable ? (
                                        <><Check className="h-4 w-4 text-green-500"/> I am currently available.</>
                                    ) : (
                                        <><Power className="h-4 w-4 text-red-500"/> I am not available.</>
                                    )}
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Edit Your Profile</DialogTitle>
                                    <DialogDescription>
                                        Update your personal and professional information. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <EditProfileForm 
                                    userProfile={userProfile} 
                                    onSuccess={() => setIsEditDialogOpen(false)} 
                                />
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
        
        <MyBookingsCard userProfile={userProfile} />

        <PlanManagement userProfile={userProfile} appConfig={appConfig} />
        
        {userProfile.role === 'Company' && <CompanyVacancies userProfile={userProfile} />}

      </div>
    </div>
  );
}
