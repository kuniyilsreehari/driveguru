
'use client';

import { Suspense, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { Loader2, Star, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, LogIn, Lock, Building, FileDown, Home } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FloatingActions } from '@/components/floating-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
    state?: string;
    city?: string;
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
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

function ExpertProfileContent() {
    const params = useParams();
    const expertId = params.expertId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const profileCardRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);


    const { data: expert, isLoading: isLoadingExpert } = useDoc<ExpertUserProfile>(expertDocRef);

    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    };
    
    const displayName = expert?.companyName || `${expert?.firstName} ${expert?.lastName}`;
    
    const handleDownloadPdf = async () => {
        const element = profileCardRef.current;
        if (!element || !expert) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not capture profile content.' });
            return;
        }

        setIsGeneratingPdf(true);

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Increase resolution
                useCORS: true, // For external images
                backgroundColor: null, // Use element's background
            });
            const imgData = canvas.toDataURL('image/png');

            // A4 page dimensions in mm: 210 x 297
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;

            let finalImgWidth = pdfWidth - 20; // with margin
            let finalImgHeight = finalImgWidth / ratio;
            
            if (finalImgHeight > pdfHeight - 20) {
                finalImgHeight = pdfHeight - 20;
                finalImgWidth = finalImgHeight * ratio;
            }
            
            const x = (pdfWidth - finalImgWidth) / 2;
            const y = 10; // Top margin

            pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
            pdf.save(`${displayName}-profile.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'An unexpected error occurred.' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (isLoadingExpert || isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Expert Profile...</p>
            </div>
        );
    }

    if (!expert) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold">Expert Not Found</h1>
                <p className="text-muted-foreground mt-2">The profile you are looking for does not exist.</p>
                <Button asChild variant="outline" className="mt-6">
                    <Link href="/"><ChevronLeft className="mr-2 h-4 w-4"/> Back to Home</Link>
                </Button>
            </div>
        );
    }

    const isPremium = expert.tier === 'Premier' || expert.tier === 'Super Premier';
    const locationString = [expert.city, expert.state, expert.pincode].filter(Boolean).join(', ');

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                </div>
                
                {!user && (
                    <Card className="mb-6 bg-primary/10 border-primary/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <LogIn className="h-8 w-8 text-primary" />
                                <div>
                                    <h4 className="font-bold text-lg">Join our community!</h4>
                                    <p className="text-sm text-muted-foreground">Log in or sign up to contact experts and leave reviews.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline"><Link href="/login">Log In</Link></Button>
                                <Button asChild><Link href="/signup">Sign Up</Link></Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card ref={profileCardRef}>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <Avatar className="h-32 w-32 text-5xl">
                                <AvatarImage src={expert.photoUrl} alt={displayName} />
                                <AvatarFallback>{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-4xl font-bold">{displayName}</h1>
                                    {expert.isAvailable ? (
                                        <Badge className="bg-green-500 text-white">Available</Badge>
                                    ) : (
                                        <Badge variant="secondary">Unavailable</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                    {expert.verified ? (
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
                                    <Badge variant="secondary">{expert.role}</Badge>
                                    {expert.department && <Badge variant="secondary">{expert.department}</Badge>}
                                    {expert.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                    {expert.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Separator className="my-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex items-start gap-3">
                                <UserIcon className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Gender:</span> {expert.gender || 'Not specified'}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <IndianRupee className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Hourly Rate:</span> {expert.hourlyRate ? `₹${expert.hourlyRate}/hr` : 'Not specified'}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Experience:</span> {expert.yearsOfExperience ? `${expert.yearsOfExperience} years` : 'Not specified'}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Location:</span> {locationString || 'Not specified'}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <GraduationCap className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Qualification:</span> {expert.qualification || 'Not specified'}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <School className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">College:</span> {expert.collegeName || 'Not specified'}</p>
                            </div>
                             {(expert.role === 'Company' || expert.role === 'Authorized Pro') && (
                                <>
                                    {expert.department && (
                                    <div className="flex items-start gap-3">
                                        <Building className="h-5 w-5 text-muted-foreground mt-1" />
                                        <p><span className="font-semibold">Department:</span> {expert.department}</p>
                                    </div>
                                    )}
                                    {expert.address && (
                                    <div className="flex items-start gap-3 md:col-span-2">
                                        <Home className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                        <p><span className="font-semibold">Address:</span> {expert.address}</p>
                                    </div>
                                    )}
                                </>
                            )}
                        </div>
                        <Separator className="my-6" />
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-3 text-lg"><Info className="h-5 w-5" /> About Me</h4>
                                <p className="text-muted-foreground text-sm pl-7">{expert.aboutMe || 'No information provided.'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-3 text-lg"><Book className="h-5 w-5" /> Skills</h4>
                                <div className="flex flex-wrap gap-2 pl-7">
                                    {expert.skills ? expert.skills.split(',').map((skill, index) => (
                                        <Badge key={index} variant="secondary">{skill.trim()}</Badge>
                                    )) : <p className="text-sm text-muted-foreground">No skills specified.</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <FloatingActions 
                    expert={expert}
                    isPremium={isPremium} 
                    isGeneratingPdf={isGeneratingPdf} 
                    onDownloadPdf={handleDownloadPdf} 
                />
            </div>
        </div>
    );
}

// Wrapper component to handle Firebase context availability
export default function ExpertProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <ExpertProfileContent />
        </Suspense>
    );
}
