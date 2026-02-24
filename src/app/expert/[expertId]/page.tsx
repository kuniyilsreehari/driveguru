
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, arrayUnion, arrayRemove, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Loader2, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, LogIn, Lock, Building, Home, MessageSquare, PenSquare, Factory, Linkedin, Twitter, Github, Globe, UserPlus, UserMinus, Phone, Youtube, Share2, Rss, Fingerprint, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FloatingActions } from '@/components/floating-actions';
import { WhatsAppBookingDialog } from '@/components/whatsapp-booking-dialog';
import { Icons } from '@/components/icons';
import { FollowerStats } from '@/components/follower-stats';
import { ShareDialog } from '@/components/share-dialog';
import { ImageLightbox } from '@/components/image-lightbox';
import { cn } from '@/lib/utils';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    category?: string;
    profession?: string;
    photoUrl?: string;
    photoUrl2?: string;
    photoUrl3?: string;
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

        if (!currentUserDocRef || !expert || !currentUserProfile) return;

        setIsFollowLoading(true);
        try {
            const updateAction = isFollowing ? arrayRemove(expert.id) : arrayUnion(expert.id);
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            
            if (!isFollowing) {
                // Create notification for the target expert
                const targetNotifRef = collection(firestore, 'users', expert.id, 'notifications');
                addDocumentNonBlocking(targetNotifRef, {
                    type: 'new_follower',
                    message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} started following you.`,
                    link: `/expert/${user?.uid}`,
                    read: false,
                    actorId: user?.uid,
                    actorName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    actorPhotoUrl: currentUserProfile.photoUrl || '',
                    createdAt: serverTimestamp(),
                });
            }

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
    
    const dgId = useMemo(() => {
        if (!expert?.id) return '';
        return `DG-${expert.id.substring(0, 8).toUpperCase()}`;
    }, [expert?.id]);

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

    const allPhotos = [expert.photoUrl, expert.photoUrl2, expert.photoUrl3].filter(Boolean) as string[];
    
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {user && user.uid !== expert.id && (
                            <Button 
                                variant={isFollowing ? 'outline' : 'default'} 
                                onClick={handleToggleFollow} 
                                disabled={isFollowLoading}
                                className={cn(
                                    "transition-all duration-300 font-black",
                                    !isFollowing && "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20",
                                    isFollowing && "border-white/10 hover:bg-white/5"
                                )}
                            >
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
                    <div className="mb-6 bg-orange-50 dark:bg-orange-950/10 border-2 border-orange-200 dark:border-orange-900/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl">
                                <LogIn className="h-8 w-8 text-orange-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-xl text-orange-900 dark:text-orange-100 tracking-tight">Join our community!</h4>
                                <p className="text-sm text-orange-800/60 dark:text-orange-200/60 font-medium">Log in or sign up to contact experts and leave reviews.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button asChild variant="outline" className="flex-1 md:w-28 h-12 rounded-xl border-orange-200 bg-white dark:bg-transparent text-orange-900 dark:text-orange-100 font-bold hover:bg-orange-50 transition-colors">
                                <Link href="/login">Log In</Link>
                            </Button>
                            <Button asChild className="flex-1 md:w-28 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                                <Link href="/signup">Sign Up</Link>
                            </Button>
                        </div>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start gap-8">
                            <div className="flex flex-col gap-4">
                                <ImageLightbox images={allPhotos} initialIndex={0} altText={displayName}>
                                    <Avatar className="h-40 w-40 text-5xl transition-all hover:scale-105 hover:opacity-90 active:scale-95 shadow-xl border-4 border-primary/20">
                                        <AvatarImage 
                                            src={expert.photoUrl} 
                                            alt={displayName} 
                                            onContextMenu={(e) => e.preventDefault()} 
                                            draggable={false}
                                            className="select-none object-cover"
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary font-black">{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                                    </Avatar>
                                </ImageLightbox>
                                <div className="flex gap-2 justify-center">
                                    {expert.photoUrl2 && (
                                        <ImageLightbox images={allPhotos} initialIndex={allPhotos.indexOf(expert.photoUrl2)} altText={`${displayName} Secondary 1`}>
                                            <Avatar className="h-16 w-16 transition-all hover:scale-110 active:scale-95 shadow-md border-2 border-white/10">
                                                <AvatarImage src={expert.photoUrl2} className="object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                                <AvatarFallback><ImageIcon className="h-4 w-4 opacity-30" /></AvatarFallback>
                                            </Avatar>
                                        </ImageLightbox>
                                    )}
                                    {expert.photoUrl3 && (
                                        <ImageLightbox images={allPhotos} initialIndex={allPhotos.indexOf(expert.photoUrl3)} altText={`${displayName} Secondary 2`}>
                                            <Avatar className="h-16 w-16 transition-all hover:scale-110 active:scale-95 shadow-md border-2 border-white/10">
                                                <AvatarImage src={expert.photoUrl3} className="object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                                <AvatarFallback><ImageIcon className="h-4 w-4 opacity-30" /></AvatarFallback>
                                            </Avatar>
                                        </ImageLightbox>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-4xl font-bold">{displayName}</h1>
                                        <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/30 bg-primary/5 text-primary px-2">
                                            <Fingerprint className="h-3 w-3 mr-1" /> {dgId}
                                        </Badge>
                                    </div>
                                    {expert.isAvailable ? (
                                        <Badge className="bg-green-500 text-white rounded-full px-4 text-[10px] font-black h-6">Available</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="rounded-full px-4 text-[10px] font-black h-6">Unavailable</Badge>
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
                                    <Badge variant="secondary" className={cn(
                                        "text-white border-none",
                                        expert.role === 'Freelancer' ? "bg-blue-600" :
                                        expert.role === 'Company' ? "bg-indigo-600" :
                                        expert.role === 'Authorized Pro' ? "bg-emerald-600" :
                                        "bg-secondary"
                                    )}>{expert.role}</Badge>
                                    {expert.category && <Badge variant="secondary" className="bg-white/5 border border-white/10 text-muted-foreground"><List className="mr-1 h-3 w-3" />{expert.category}</Badge>}
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
                                <div className="w-full bg-[#3a2a1a] border-2 border-orange-500/20 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                                    <div className="bg-orange-500/10 p-3 rounded-full">
                                        <Lock className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-lg tracking-tight">Contact Information Restricted</h4>
                                        <p className="text-sm text-orange-200/60 font-medium max-w-sm">
                                            {!user ? (
                                                <>Please <Link href="/login" className="text-orange-500 underline underline-offset-4 hover:text-orange-400">sign in</Link> to connect with this professional.</>
                                            ) : !expert.verified ? (
                                                "This expert is currently completing their safety verification process."
                                            ) : (
                                                "Direct contact is currently disabled by the expert."
                                            )}
                                        </p>
                                    </div>
                                    {!user && (
                                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl px-8 shadow-lg shadow-orange-500/20">
                                            <Link href="/signup">Join DriveGuru Now</Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardFooter>
                </Card>
                <FloatingActions expert={expert} />
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
