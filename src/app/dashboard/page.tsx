
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Briefcase, Loader, Edit, UserCheck, XCircle, MapPin, IndianRupee, Calendar, Book, GraduationCap, School, Info, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    location?: string;
    category?: string;
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
};

export default function ExpertDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch the user's profile from Firestore
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    if (auth) {
        signOut(auth);
    }
  };
  
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
    // This will be shown briefly before the redirect in useEffect kicks in
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                        <Briefcase className="h-10 w-10 text-primary" />
                        <div>
                            <CardTitle className="text-4xl font-bold">Expert Dashboard</CardTitle>
                            <CardDescription>Welcome, {userProfile.firstName} {userProfile.lastName}.</CardDescription>
                            <div className="flex items-center gap-2 mt-2">
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
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                <Separator className="my-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Gender:</span> {userProfile.gender || 'Not specified'}</p>
                    </div>
                     <div className="flex items-center gap-3">
                        <IndianRupee className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Hourly Rate:</span> {userProfile.hourlyRate ? `₹${userProfile.hourlyRate}/hr` : 'Not specified'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Experience:</span> {userProfile.yearsOfExperience ? `${userProfile.yearsOfExperience} years` : 'Not specified'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Location:</span> {userProfile.location || 'Not specified'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">Qualification:</span> {userProfile.qualification || 'Not specified'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <School className="h-5 w-5 text-muted-foreground" />
                        <p><span className="font-semibold">College:</span> {userProfile.collegeName || 'Not specified'}</p>
                    </div>
                </div>
                <Separator className="my-6" />
                 <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Book className="h-5 w-5" /> Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.skills ? userProfile.skills.split(',').map((skill, index) => (
                                <Badge key={index} variant="secondary">{skill.trim()}</Badge>
                            )) : <p className="text-muted-foreground text-sm">No skills specified.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Info className="h-5 w-5" /> About Me</h4>
                        <p className="text-muted-foreground text-sm">{userProfile.aboutMe || 'No information provided.'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
