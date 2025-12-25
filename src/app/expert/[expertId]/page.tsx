

'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, arrayUnion, arrayRemove, query, collection, where } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { Loader2, Star, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, LogIn, Lock, Building, FileDown, Home, MessageSquare, PenSquare, Factory, Linkedin, Twitter, Github, Globe, UserPlus, UserMinus, Users, List, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
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
    category?: string;
    photoUrl?: string;
    state?: string;
    city?: string;
    pincode?: string;
    address?: string;
    verified?: boolean;
    pricingModel?: string;
    pricingValue?: number;
    yearsOfExperience?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    aboutYourDream?: string;
    associatedProjectsName?: string;
    phoneNumber?: string;
    companyName?: string;
    department?: string;
    isAvailable?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    linkedinUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    following?: string[];
};

function FollowerStats({ expert }: { expert: ExpertUserProfile }) {
    const firestore = useFirestore();

    const followersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('following', 'array-contains', expert.id));
    }, [firestore, expert.id]);

    const { data: followers, isLoading: isLoadingFollowers } = useCollection(followersQuery);
    
    const followingCount = expert.following?.length || 0;

    if (isLoadingFollowers) {
        return <p className="text-sm text-muted-foreground">Loading stats...</p>;
    }

    return (
        <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{followers?.length || 0} Followers</p>
            </div>
            <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">{followingCount} Following</p>
            </div>
        </div>
    );
}


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

    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);

    const currentUserDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);


    const { data: expert, isLoading: isLoadingExpert } = useDoc<ExpertUserProfile>(expertDocRef);
    const { data: currentUserProfile } = useDoc<ExpertUserProfile>(currentUserDocRef);

    useEffect(() => {
        if (currentUserProfile && expert) {
            setIsFollowing(currentUserProfile.following?.includes(expert.id) || false);
        }
    }, [currentUserProfile, expert]);

    const handleToggleFollow = async () => {
        if (!currentUserDocRef || !expert) return;

        setIsFollowLoading(true);
        try {
            const updateAction = isFollowing ? arrayRemove(expert.id) : arrayUnion(expert.id);
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            setIsFollowing(!isFollowing);
            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are no longer following ${getDisplayName(expert)}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
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
    
    const cleanPhoneNumber = (phoneNumber?: string) => {
        if (!phoneNumber) return '';
        return phoneNumber.replace(/\s+/g, '');
    }
    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);
    const canContact = expert.verified && formattedPhoneNumber && isPremium;

    const createWhatsAppMessage = () => {
        const expertName = getDisplayName(expert);
        const clientName = currentUserProfile ? `${currentUserProfile.firstName} ${currentUserProfile.lastName}` : "a potential client";
        
        const message = `*New Booking Request from DriveGuru*
Hello ${expertName},

A new appointment has been requested by *${clientName}*.

*Client Details:*
• Name: ${clientName}
• Email: ${currentUserProfile?.email || "not provided"}

*Appointment Details:*
• Date: [Please enter desired date]
• Time: [Please enter desired time]
• Location: [Please enter location]
• Work Required: [Please describe the work]

--------------------
*To the Expert:* Please reply to confirm or cancel this appointment.
*Simply reply with "Confirm" or "Cancel".*`;
        
        return `https://wa.me/${formattedPhoneNumber}?text=${encodeURIComponent(message)}`;
    };
    
    const whatsappLink = createWhatsAppMessage();
    

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    {user && user.uid !== expert.id && (
                        <Button variant={isFollowing ? 'secondary' : 'default'} onClick={handleToggleFollow} disabled={isFollowLoading}>
                            {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            {isFollowing ? 'Unfollow' : 'Follow'}
                        </Button>
                    )}
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
                                  {expert.linkedinUrl && <a href={expert.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.twitterUrl && <a href={expert.twitterUrl} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.githubUrl && <a href={expert.githubUrl} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
                                  {expert.portfolioUrl && <a href={expert.portfolioUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-primary"/></a>}
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
                                <p><span className="font-semibold">Rate:</span> {expert.pricingValue ? `₹${expert.pricingValue}` : 'Not specified'}{expert.pricingModel && ` / ${expert.pricingModel}`}</p>
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
                                    <Button asChild className="flex-1" size="lg">
                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                            <MessageSquare className="mr-2 h-4 w-4" /> Book via WhatsApp
                                        </a>
                                    </Button>
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
                                            <p>Contact is only available for verified Premier or Super Premier experts.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </CardFooter>
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
