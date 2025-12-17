
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Briefcase, Loader, Edit, UserCheck, XCircle, MapPin, IndianRupee, Calendar, Book, GraduationCap, School, Info, User as UserIcon, Check, Power, Building, PlusCircle, Crown, Sparkles, Lock, Home } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    tier?: 'Standard' | 'Premier' | 'Super Premier';
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

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

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

  const profileCompletion = calculateProfileCompletion(userProfile);
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }
  
  const locationString = [userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ');

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
        
        {userProfile.role === 'Company' && <CompanyVacancies userProfile={userProfile} />}

      </div>
    </div>
  );
}

    