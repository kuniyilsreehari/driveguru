

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, getDoc, runTransaction, increment } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Briefcase, Loader, Edit, UserCheck, XCircle, MapPin, IndianRupee, Calendar, Book, GraduationCap, School, Info, User as UserIcon, Check, Power, Building, PlusCircle, Crown, Sparkles, Lock, Home, ArrowUpCircle, ShieldCheck, ExternalLink, Gift, Copy, Shield, AlertTriangle, ChevronDown } from 'lucide-react';
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
};

function CompanyVacancies({ userProfile }: { userProfile: ExpertUserProfile }) {
  const firestore = useFirestore();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const isPremiumWithCompanyId = (userProfile.tier === 'Premier' || userProfile.tier === 'Super Premier') && !!userProfile.companyId;

  const vacanciesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile.companyId) return null;
    return query(collection(firestore, 'vacancies'), where('companyId', '==', userProfile.companyId));
  }, [firestore, userProfile.companyId]);

  const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Manage Vacancies</CardTitle>
            <CardDescription>Post and view job openings for your company.</CardDescription>
          </div>
           {isPremiumWithCompanyId ? (
              <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post New Vacancy
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create a New Vacancy</DialogTitle>
                    <DialogDescription>Fill out the details below to post a new job opening.</DialogDescription>
                  </DialogHeader>
                  <PostVacancyForm
                    companyId={userProfile.companyId!}
                    companyName={userProfile.companyName!}
                    companyEmail={userProfile.email}
                    onSuccess={() => setIsPostDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
           ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button disabled className="w-full sm:w-auto">
                                <Lock className="mr-2 h-4 w-4" />
                                Post New Vacancy
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>This is a Premium feature. Upgrade to post vacancies.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
           )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        ) : vacancies && vacancies.length > 0 ? (
          <div className="space-y-4">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-semibold">{vacancy.title}</h4>
                  <p className="text-sm text-muted-foreground">{vacancy.location} &middot; {vacancy.employmentType}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/vacancies#${vacancy.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">You haven&apos;t posted any vacancies yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function UpgradeDialog({ userProfile, tier, billingCycle, price }: { userProfile: ExpertUserProfile, tier: 'Premier' | 'Super Premier' | 'Verification', billingCycle: 'daily' | 'monthly' | 'yearly' | 'one-time', price?: number }) {
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleUpgrade = async () => {
        setIsCreatingOrder(true);
        try {
            const { payment_link } = await createPaymentOrder({
                userId: userProfile.id,
                userEmail: userProfile.email,
                userName: `${userProfile.firstName} ${userProfile.lastName}`,
                userPhone: userProfile.phoneNumber || '',
                plan: tier,
                billingCycle: billingCycle,
            });

            if (payment_link) {
                router.push(payment_link);
            } else {
                throw new Error("Could not retrieve payment link.");
            }
        } catch (error: any) {
            console.error("Payment order creation failed:", error);
            toast({
                variant: 'destructive',
                title: "Action Failed",
                description: error.message || "Could not initiate the payment process. Please try again.",
            });
        } finally {
            setIsCreatingOrder(false);
        }
    }

    let buttonText = `Upgrade to ${tier}`;
    if (tier === 'Verification') {
        buttonText = 'Get Verified';
    }
    if (price && price > 0) {
        buttonText += ` for ₹${price}`;
    }


    const dialogTitle = tier === 'Verification' ? 'Become a Verified Expert' : `Upgrade to ${tier}`;
    
    let dialogDescription = "You will be redirected to our secure payment gateway to complete your purchase. Your account will be upgraded automatically upon successful payment.";
    if (tier === 'Verification') {
        dialogDescription = `You will be redirected to our secure payment gateway to pay the one-time verification fee. Your account will be marked as verified upon successful payment.`;
        if (price) {
            dialogDescription = `You will be redirected to our secure payment gateway to pay the one-time verification fee of ₹${price}. Your account will be marked as verified upon successful payment.`;
        }
    }


    return (
        <Dialog>
            <DialogTrigger asChild>
                 <Button className="w-full justify-start" variant="ghost" size="sm">
                    {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} - ₹{price}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogTitle} - {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}</DialogTitle>
                    <DialogDescription>
                       {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Button onClick={handleUpgrade} disabled={isCreatingOrder} className="w-full">
                        {isCreatingOrder ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        {isCreatingOrder ? 'Processing...' : `Proceed to Pay ₹${price}`}
                    </Button>
                </div>
                <DialogFooter>
                    <DialogTrigger asChild>
                        <Button variant="outline">Close</Button>
                    </DialogTrigger>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function PlanManagement({ userProfile, appConfig }: { userProfile: ExpertUserProfile; appConfig: AppConfig | null }) {
    const PlanCard = ({ title, icon, description, features, children, current }: { title: string; icon: React.ReactNode; description: string; features: string[]; children?: React.ReactNode, current?: boolean }) => (
        <Card className={cn("flex flex-col", current && "border-primary ring-2 ring-primary")}>
            <CardHeader className="text-center">
                <div className={cn("mx-auto w-fit rounded-full p-3 mb-2", current ? "bg-primary/10" : "bg-secondary")}>
                    {icon}
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                <ul className="space-y-2">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex-col">
                {current ? (
                    <Button variant="outline" disabled className="w-full"><ShieldCheck className="mr-2 h-4 w-4" /> Current Plan</Button>
                ) : (
                    children
                )}
            </CardFooter>
        </Card>
    );

    const UpgradeButton = ({ tier, prices }: { tier: 'Premier' | 'Super Premier', prices?: PlanPrices }) => {
        if (!prices || Object.values(prices).every(p => !p || p <= 0)) {
            return <Button disabled className="w-full mt-auto"><ArrowUpCircle className="mr-2 h-4 w-4" />Upgrade to {tier}</Button>;
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="w-full mt-auto">
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Upgrade to {tier}
                        <ChevronDown className="ml-auto h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {prices.daily && prices.daily > 0 && <DropdownMenuItem asChild><UpgradeDialog userProfile={userProfile} tier={tier} billingCycle="daily" price={prices.daily} /></DropdownMenuItem>}
                    {prices.monthly && prices.monthly > 0 && <DropdownMenuItem asChild><UpgradeDialog userProfile={userProfile} tier={tier} billingCycle="monthly" price={prices.monthly} /></DropdownMenuItem>}
                    {prices.yearly && prices.yearly > 0 && <DropdownMenuItem asChild><UpgradeDialog userProfile={userProfile} tier={tier} billingCycle="yearly" price={prices.yearly} /></DropdownMenuItem>}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Your Plan</CardTitle>
                <CardDescription>Upgrade your plan to unlock powerful new features and increase your visibility.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <PlanCard
                        title="Premier"
                        icon={<Crown className="h-6 w-6" />}
                        description="Get noticed and build trust."
                        features={["Public profile listing", "AI-Powered Search access", "Post job vacancies", "Downloadable PDF profile"]}
                        current={userProfile.tier === 'Premier'}
                     >
                        {(userProfile.tier === 'Standard' || !userProfile.tier) && <UpgradeButton tier="Premier" prices={appConfig?.premierPlanPrices} />}
                     </PlanCard>
                     <PlanCard
                        title="Super Premier"
                        icon={<Sparkles className="h-6 w-6" />}
                        description="Maximum visibility and tools."
                        features={["All Premier features", "Top placement in search results", "Featured expert listing"]}
                        current={userProfile.tier === 'Super Premier'}
                     >
                        {userProfile.tier !== 'Super Premier' && <UpgradeButton tier="Super Premier" prices={appConfig?.superPremierPlanPrices} />}
                    </PlanCard>
                </div>
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

  const copyReferralCode = () => {
    if (!userProfile?.referralCode) return;
    navigator.clipboard.writeText(userProfile.referralCode);
    toast({
      title: 'Referral Code Copied',
      description: 'Your referral code has been copied to your clipboard.',
    });
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
  
  const isLoading = isUserLoading || isProfileLoading || isAppConfigLoading || isRoleLoading;

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
            <CardContent>
                {!userProfile.verified && (
                    <div className="bg-blue-900/20 border border-blue-700 text-blue-200 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Shield className="h-8 w-8 text-blue-400 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold">Become a Verified Expert</h4>
                                <p className="text-sm text-blue-300">
                                    Unlock contact features and gain client trust.
                                    {verificationFee ? ` Your account will be marked as verified upon successful payment of ₹${verificationFee}.` : ' Verify your profile for a one-time fee.'}
                                </p>
                            </div>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="default" className="mt-auto w-full sm:w-auto bg-green-600 hover:bg-green-700">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Get Verified {verificationFee && verificationFee > 0 ? ` for ₹${verificationFee}` : ''}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Become a Verified Expert</DialogTitle>
                                  <DialogDescription>
                                    You will be redirected to our secure payment gateway to pay the one-time verification fee.
                                  </DialogDescription>
                                </DialogHeader>
                                <UpgradeDialog userProfile={userProfile} tier="Verification" billingCycle="one-time" price={verificationFee} />
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
                
                <div className="my-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Profile Completion</h4>
                    <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                  {profileCompletion < 100 && <p className="text-xs text-muted-foreground mt-2">Complete your profile to attract more clients. Click &apos;Edit Profile&apos; to get started.</p>}
                </div>

                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Gender:</span> {userProfile.gender || <span className="text-destructive">Not specified</span>}</p>
                    </div>
                     <div className="flex items-center gap-3">
                        <IndianRupee className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Hourly Rate:</span> {userProfile.hourlyRate ? `₹${userProfile.hourlyRate}/hr` : <span className="text-destructive">Not specified</span>}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Experience:</span> {userProfile.yearsOfExperience ? `${userProfile.yearsOfExperience} years` : <span className="text-destructive">Not specified</span>}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Location:</span> {locationString || <span className="text-destructive">Not specified</span>}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Qualification:</span> {userProfile.qualification || <span className="text-destructive">Not specified</span>}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <School className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">College:</span> {userProfile.collegeName || <span className="text-destructive">Not specified</span>}</p>
                    </div>
                    {(userProfile.role === 'Company' || userProfile.role === 'Authorized Pro') && (
                        <>
                            <div className="flex items-center gap-3">
                                <Building className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Department:</span> {userProfile.department || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Home className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                <p><span className="font-semibold">Address:</span> {userProfile.address || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                        </>
                    )}
                </div>
                <Separator className="my-6" />
                 <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Book className="h-5 w-5" /> Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.skills ? userProfile.skills.split(',').map((skill, index) => (
                                <Badge key={index} variant="secondary">{skill.trim()}</Badge>
                            )) : <p className="text-sm text-destructive">No skills specified.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Info className="h-5 w-5" /> About Me</h4>
                        <p className="text-muted-foreground text-sm">{userProfile.aboutMe || <span className="text-destructive">No information provided.</span>}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 pt-6">
                <p className="text-xs text-muted-foreground">
                    Use the toggle at the top to control your visibility for new job offers in search results.
                </p>
            </CardFooter>
        </Card>

        {userProfile.referralCode && (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Gift className="h-6 w-6 text-primary" />
                        <div>
                            <CardTitle>Referral Rewards</CardTitle>
                            <CardDescription>Invite others and earn rewards.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-secondary">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-muted-foreground">Your Referral Code</p>
                            <p className="text-2xl font-mono tracking-widest text-secondary-foreground">{userProfile.referralCode}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={copyReferralCode}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Code
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-lg border text-center">
                            <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                            <p className="text-3xl font-bold">{userProfile.referralPoints || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg border text-center">
                            <p className="text-sm font-medium text-muted-foreground">Estimated Earnings</p>
                            <p className="text-3xl font-bold">₹{userProfile.referralPoints || 0}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">Share your code to earn points. 1 point = ₹1. Earnings can be redeemed upon request.</p>
                </CardFooter>
            </Card>
        )}

        {isSuperAdmin && userProfile.referredByCode && (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Gift className="h-6 w-6 text-primary" />
                        <div>
                            <CardTitle>Admin: Referral Action</CardTitle>
                            <CardDescription>This user was referred. Award points to the referrer.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-secondary">
                        <div>
                            <p className="text-sm text-muted-foreground">Used Referral Code</p>
                            <p className="text-2xl font-mono tracking-widest text-secondary-foreground">{userProfile.referredByCode}</p>
                        </div>
                        <Button onClick={() => handleAwardReferral(userProfile)}>
                            <Gift className="mr-2 h-4 w-4" /> Award Points
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        <PlanManagement userProfile={userProfile} appConfig={appConfig} />
        
        {userProfile.role === 'Company' && <CompanyVacancies userProfile={userProfile} />}

      </div>
    </div>
  );
}
