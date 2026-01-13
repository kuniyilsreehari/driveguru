

'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, arrayUnion, arrayRemove, query, collection, where } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { Loader2, Star, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, LogIn, Lock, Building, FileDown, Home, MessageSquare, PenSquare, Factory, Linkedin, Twitter, Github, Globe, UserPlus, UserMinus, Users, List, Phone, Youtube, Share2, Rss } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FloatingActions } from '@/components/floating-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WhatsAppBookingDialog } from '@/components/whatsapp-booking-dialog';
import { Icons } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FollowerStats } from '@/components/follower-stats';
import { ShareDialog } from '@/components/share-dialog';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    category?: string;
    profession?: string;
    photoUrl?: string;
    state?: string;
    city?: string;
    pincode?: string;
    address?: string;
    verified?: boolean;
    pricingModel?: string;
    pricingValue?: number;
    experienceYears?: number;
    experienceMonths?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    aboutYourDream?: string;
    associatedProjectsName?: string;
    phoneNumber?: string;
    showPhoneNumberOnProfile?: boolean;
    companyName?: string;
    department?: string;
    isAvailable?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    linkedinUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    following?: string[];
};

function ExpertProfileContent() {
    const params = useParams();
    const expertId = params.expertId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const profileCardRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);


    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);

    const currentUserDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const superAdminDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);

    const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;


    const { data: expert, isLoading: isLoadingExpert } = useDoc<ExpertUserProfile>(expertDocRef);
    const { data: currentUserProfile } = useDoc<ExpertUserProfile>(currentUserDocRef);

    useEffect(() => {
        if (currentUserProfile && expert) {
            setIsFollowing(currentUserProfile.following?.includes(expert.id) || false);
        }
    }, [currentUserProfile, expert]);

    const handleToggleFollow = async () => {
        if (isSuperAdmin) {
            toast({
                variant: 'destructive',
                title: 'Action Not Allowed',
                description: "You are a Super Admin and cannot follow other users.",
            });
            return;
        }

        if (!currentUserDocRef || !expert) return;

        setIsFollowLoading(true);
        try {
            const updateAction = isFollowing ? arrayRemove(expert.id) : arrayUnion(expert.id);
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            setIsFollowing(!isFollowing);
            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are now ${isFollowing ? 'no longer following' : 'following'} ${getDisplayName(expert)}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
            }
        } finally {
            setIsFollowLoading(false);
        }
    }


    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    };
    
    const getDisplayName = (expert?: ExpertUserProfile) => {
        if (!expert) return '';
        return expert.companyName || `${expert.firstName} ${expert.lastName}`;
    }

    const displayName = getDisplayName(expert);
    
    const handleDownloadPdf = async () => {
        const element = profileCardRef.current;
        if (!element || !expert) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not capture profile content.' });
            return;
        }
        
        const isPremium = expert.tier === 'Premier' || expert.tier === 'Super Premier';
        if (!isPremium) {
            setIsPremiumDialogOpen(true);
            return;
        }

        setIsGeneratingPdf(true);

        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: html2canvas } = await import('html2canvas');

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

    if (isLoadingExpert || isUserLoading || isRoleLoading) {
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

    const locationString = [expert.city, expert.state, expert.pincode].filter(Boolean).join(', ');
    const experienceString = [
      expert.experienceYears ? `${expert.experienceYears} years` : null,
      expert.experienceMonths ? `${expert.experienceMonths} months` : null,
    ].filter(Boolean).join(', ') || 'Not specified';
    
    const cleanPhoneNumber = (phoneNumber?: string) => {
        if (!phoneNumber) return '';
        return phoneNumber.replace(/\s+/g, '');
    }
    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);
    const canContact = expert.verified && expert.showPhoneNumberOnProfile && formattedPhoneNumber;
    
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {user && user.uid !== expert.id && (
                            <Button variant={isFollowing ? 'secondary' : 'default'} onClick={handleToggleFollow} disabled={isFollowLoading}>
                                {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                           <Link href={`/feed?authorId=${expert.id}`}>
                                <Rss className="mr-2 h-4 w-4" />
                                View Posts
                            </Link>
                        </Button>
                        <ShareDialog shareDetails={{ type: 'expert-profile', expertId: expert.id, expertName: displayName }}>
                            <Button variant="outline">
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </ShareDialog>
                    </div>
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
                                {expert.profession && <p className="text-lg font-semibold text-primary">{expert.profession}</p>}
                                <FollowerStats expert={expert} />
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
                                    {expert.category && <Badge variant="secondary"><List className="mr-1 h-3 w-3" />{expert.category}</Badge>}
                                    {expert.department && <Badge variant="secondary">{expert.department}</Badge>}
                                    {expert.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                    {expert.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-4">
                                  {expert.portfolioUrl && <a href={expert.portfolioUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.facebookUrl && <a href={expert.facebookUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.instagramUrl && <a href={expert.instagramUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.youtubeUrl && <a href={expert.youtubeUrl} target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.linkedinUrl && <a href={expert.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.twitterUrl && <a href={expert.twitterUrl} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.githubUrl && <a href={expert.githubUrl} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
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
                                <p>
                                  <span className="font-semibold">Rate:</span>{' '}
                                  {expert.pricingValue ? (
                                    <span>
                                      {`₹${expert.pricingValue}`}
                                      {expert.pricingModel && ` / ${expert.pricingModel}`}
                                    </span>
                                  ) : (
                                    'Not specified'
                                  )}
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                                <p><span className="font-semibold">Experience:</span> {experienceString}</p>
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
                                <h4 className="font-semibold flex items-center gap-2 mb-3 text-lg"><PenSquare className="h-5 w-5" /> About My Dream</h4>
                                <p className="text-muted-foreground text-sm pl-7">{expert.aboutYourDream || 'No information provided.'}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-3 text-lg"><Factory className="h-5 w-5" /> Associated Projects</h4>
                                <p className="text-muted-foreground text-sm pl-7">{expert.associatedProjectsName || 'No projects listed.'}</p>
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
                    <CardFooter className="p-6 mt-4">
                        <div className="flex flex-col sm:flex-row w-full gap-2">
                            {canContact ? (
                                <>
                                    <WhatsAppBookingDialog expert={expert}>
                                        <Button className="flex-1" size="lg">
                                            <MessageSquare className="mr-2 h-4 w-4" /> Book via WhatsApp
                                        </Button>
                                    </WhatsAppBookingDialog>
                                    <Button asChild variant="outline" className="flex-1 bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20 hover:text-green-500" size="lg">
                                        <a href={`tel:${formattedPhoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                                    </Button>
                                </>
                            ) : (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="w-full">
                                                <Button disabled className="w-full" size="lg">
                                                    <Lock className="mr-2 h-4 w-4" /> Contact is locked
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Contact is only available for verified experts who have enabled it.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </CardFooter>
                </Card>
                <FloatingActions
                    expert={expert}
                    isGeneratingPdf={isGeneratingPdf}
                    onDownloadPdf={handleDownloadPdf}
                />
            </div>
            <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Premium Feature Locked</DialogTitle>
                    <UiDialogDescription>
                        Downloading profiles as a PDF is an exclusive feature for Premier members.
                    </UiDialogDescription>
                    </DialogHeader>
                    <div className="text-center">
                        <div className="mx-auto w-fit rounded-full p-3 mb-2 bg-primary/10">
                        <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                        Upgrade your plan to unlock this and many other powerful features.
                        </p>
                    </div>
                    <DialogFooter className="flex-col gap-2 pt-4">
                        <Button asChild className="w-full">
                            <Link href="/dashboard#plan-management">Upgrade Plan</Link>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setIsPremiumDialogOpen(false)}>
                            Maybe Later
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
