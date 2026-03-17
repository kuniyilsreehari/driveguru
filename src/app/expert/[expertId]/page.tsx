'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, arrayUnion, arrayRemove, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Loader2, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, LogIn, Lock, Building, Home, MessageSquare, PenSquare, Factory, Linkedin, Twitter, Github, Globe, UserPlus, UserMinus, Phone, Youtube, Share2, Rss, Fingerprint, ImageIcon, List, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppBookingDialog } from '@/components/whatsapp-booking-dialog';
import { Icons } from '@/components/icons';
import { FollowerStats } from '@/components/follower-stats';
import { ShareDialog } from '@/components/share-dialog';
import { ImageLightbox } from '@/components/image-lightbox';
import { cn } from '@/lib/utils';
import { useAtom } from 'jotai';
import { currentExpertAtom } from '@/lib/store';


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
    photoUrl4?: string;
    photoUrl5?: string;
    photoUrl6?: string;
    photoUrl7?: string;
    photoUrl8?: string;
    photoUrl9?: string;
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
    const [, setCurrentExpert] = useAtom(currentExpertAtom);


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

    // Sync global expert state for Floating Actions
    useEffect(() => {
        if (expert) {
            setCurrentExpert({
                id: expert.id,
                firstName: expert.firstName,
                lastName: expert.lastName,
                companyName: expert.companyName,
                phoneNumber: expert.phoneNumber,
                verified: expert.verified
            });
        }
        return () => setCurrentExpert(null);
    }, [expert, setCurrentExpert]);

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

    const allPhotos = [
        expert.photoUrl, 
        expert.photoUrl2, 
        expert.photoUrl3,
        expert.photoUrl4,
        expert.photoUrl5,
        expert.photoUrl6,
        expert.photoUrl7,
        expert.photoUrl8,
        expert.photoUrl9
    ].filter(Boolean) as string[];
    
    const buttonClass = "rounded-xl border-white/10 bg-[#1a1c23] hover:bg-white/5 font-bold h-10 px-4 text-white text-xs";

    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 mb-8">
                    <Button variant="outline" asChild className={buttonClass}>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {user && user.uid !== expert.id && (
                            <Button 
                                variant="outline" 
                                onClick={handleToggleFollow} 
                                disabled={isFollowLoading}
                                className={buttonClass}
                            >
                                {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </Button>
                        )}
                        <Button variant="outline" asChild className={buttonClass}>
                           <Link href={`/feed?authorId=${expert.id}`}>
                                <Rss className="mr-2 h-4 w-4" />
                                View Posts
                            </Link>
                        </Button>
                        <ShareDialog shareDetails={{ type: 'expert-profile', expertId: expert.id, expertName: displayName }}>
                            <Button variant="outline" className={buttonClass}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </ShareDialog>
                    </div>
                </div>
                
                {!user && (
                    <div className="mb-6 bg-orange-500/5 border-2 border-orange-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="bg-orange-500/10 p-3 rounded-xl">
                                <LogIn className="h-8 w-8 text-orange-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-xl text-white tracking-tight uppercase italic">Join our community!</h4>
                                <p className="text-sm text-muted-foreground font-medium">Log in or sign up to contact experts and leave reviews.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button asChild variant="outline" className="flex-1 md:w-28 h-12 rounded-xl border-white/10 bg-white/5 text-white font-bold hover:bg-white/10">
                                <Link href="/login">Log In</Link>
                            </Button>
                            <Button asChild className="flex-1 md:w-28 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                                <Link href="/signup">Sign Up</Link>
                            </Button>
                        </div>
                    </div>
                )}

                <Card className="border-none bg-[#24262d] rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-6 sm:p-10">
                        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <ImageLightbox images={allPhotos} initialIndex={0} altText={displayName}>
                                        <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-white/10 shadow-2xl">
                                            <AvatarImage 
                                                src={expert.photoUrl} 
                                                alt={displayName} 
                                                onContextMenu={(e) => e.preventDefault()} 
                                                draggable={false}
                                                className="select-none object-cover"
                                            />
                                            <AvatarFallback className="bg-primary/10 text-primary font-black text-2xl">{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                                        </Avatar>
                                    </ImageLightbox>
                                    {expert.isAvailable && (
                                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full px-3 py-1 text-[10px] font-black border-4 border-[#24262d] shadow-lg uppercase tracking-tighter">Available</Badge>
                                    )}
                                    {allPhotos.length > 0 && (
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#1a1c23]/90 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[9px] font-black text-white/70 uppercase tracking-widest whitespace-nowrap shadow-xl">
                                            Portfolio 1/{allPhotos.length}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden sm:grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {allPhotos.slice(1).map((photo, index) => (
                                        <ImageLightbox key={index} images={allPhotos} initialIndex={index + 1} altText={`${displayName} Portfolio ${index + 1}`}>
                                            <Avatar className="h-16 w-16 transition-all hover:scale-110 active:scale-95 shadow-md border-2 border-white/10">
                                                <AvatarImage src={photo} className="object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                                <AvatarFallback><ImageIcon className="h-4 w-4 opacity-30" /></AvatarFallback>
                                            </Avatar>
                                        </ImageLightbox>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <div className="flex flex-col items-center sm:items-start gap-2 mb-4">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-white">{displayName}</h1>
                                        <div className="flex items-center gap-1.5">
                                            {expert.verified && <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500/10" />}
                                            {expert.tier === 'Premier' && <Crown className="h-5 w-5 text-purple-500 fill-purple-500" />}
                                            {expert.tier === 'Super Premier' && <Sparkles className="h-5 w-5 text-blue-500 fill-blue-500" />}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/30 bg-primary/5 text-primary px-2">
                                        <Fingerprint className="h-3 w-3 mr-1" /> {dgId}
                                    </Badge>
                                </div>
                                
                                {expert.profession && <p className="text-sm sm:text-lg font-black text-orange-500 uppercase tracking-tighter mb-3">{expert.profession}</p>}
                                
                                <div className="flex justify-center sm:justify-start">
                                    <FollowerStats expert={expert} />
                                </div>

                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                                    <Badge variant="secondary" className={cn(
                                        "text-white border-none rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest shadow-lg",
                                        expert.role === 'Freelancer' ? "bg-blue-600 shadow-blue-600/20" :
                                        expert.role === 'Company' ? "bg-indigo-600 shadow-indigo-600/20" :
                                        expert.role === 'Authorized Pro' ? "bg-emerald-600 shadow-emerald-600/20" :
                                        "bg-secondary"
                                    )}>{expert.role}</Badge>
                                    {expert.category && <Badge variant="outline" className="bg-white/5 border border-white/10 text-muted-foreground font-bold uppercase text-[9px] tracking-widest"><List className="mr-1 h-3 w-3" />{expert.category}</Badge>}
                                </div>
                                
                                <div className="flex items-center justify-center sm:justify-start gap-4 mt-6">
                                  {expert.portfolioUrl && <a href={expert.portfolioUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.facebookUrl && <a href={expert.facebookUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.instagramUrl && <a href={expert.instagramUrl} target="_blank" rel="noopener noreferrer"><Icons.logo className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.youtubeUrl && <a href={expert.youtubeUrl} target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.linkedinUrl && <a href={expert.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.twitterUrl && <a href={expert.twitterUrl} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                  {expert.githubUrl && <a href={expert.githubUrl} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/></a>}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 sm:px-10">
                        <Separator className="my-6 bg-white/5" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex items-start gap-3">
                                <UserIcon className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Gender</span> <span className="text-white font-bold">{expert.gender || 'Not specified'}</span></p>
                            </div>
                             <div className="flex items-start gap-3">
                                <IndianRupee className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm">
                                  <span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Service Rate</span>
                                  {expert.pricingValue ? (
                                    <span className="text-white font-bold">
                                      {`₹${expert.pricingValue}`}
                                      {expert.pricingModel && <span className="text-[10px] font-medium opacity-50 ml-1">/ {expert.pricingModel}</span>}
                                    </span>
                                  ) : (
                                    <span className="text-white font-bold">Not specified</span>
                                  )}
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Experience</span> <span className="text-white font-bold">{experienceString}</span></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Location</span> <span className="text-white font-bold">{locationString || 'Not specified'}</span></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <GraduationCap className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Qualification</span> <span className="text-white font-bold">{expert.qualification || 'Not specified'}</span></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <School className="h-5 w-5 text-orange-500 mt-1" />
                                <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">College / Univ</span> <span className="text-white font-bold">{expert.collegeName || 'Not specified'}</span></p>
                            </div>
                             {(expert.role === 'Company' || expert.role === 'Authorized Pro') && (
                                <>
                                    {expert.department && (
                                    <div className="flex items-start gap-3">
                                        <Building className="h-5 w-5 text-orange-500 mt-1" />
                                        <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Department</span> <span className="text-white font-bold">{expert.department}</span></p>
                                    </div>
                                    )}
                                    {expert.address && (
                                    <div className="flex items-start gap-3 md:col-span-2">
                                        <Home className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                                        <p className="text-sm"><span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block mb-0.5">Full Address</span> <span className="text-white font-bold">{expert.address}</span></p>
                                    </div>
                                    )}
                                </>
                            )}
                        </div>
                        <Separator className="my-6 bg-white/5" />
                        <div className="space-y-8">
                            <div>
                                <h4 className="font-black flex items-center gap-2 mb-3 text-lg uppercase italic text-white"><Info className="h-5 w-5 text-orange-500" /> About Me</h4>
                                <p className="text-muted-foreground text-sm pl-7 leading-relaxed font-medium">{expert.aboutMe || 'No information provided.'}</p>
                            </div>
                             <div>
                                <h4 className="font-black flex items-center gap-2 mb-3 text-lg uppercase italic text-white"><PenSquare className="h-5 w-5 text-orange-500" /> Professional Dream</h4>
                                <p className="text-muted-foreground text-sm pl-7 leading-relaxed font-medium">{expert.aboutYourDream || 'No information provided.'}</p>
                            </div>
                             <div>
                                <h4 className="font-black flex items-center gap-2 mb-3 text-lg uppercase italic text-white"><Factory className="h-5 w-5 text-orange-500" /> Key Projects</h4>
                                <p className="text-muted-foreground text-sm pl-7 leading-relaxed font-medium">{expert.associatedProjectsName || 'No projects listed.'}</p>
                            </div>
                            <div>
                                <h4 className="font-black flex items-center gap-2 mb-3 text-lg uppercase italic text-white"><Book className="h-5 w-5 text-orange-500" /> Technical Skills</h4>
                                <div className="flex flex-wrap gap-2 pl-7">
                                    {expert.skills ? expert.skills.split(',').map((skill, index) => (
                                        <Badge key={index} variant="secondary" className="bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest">{skill.trim()}</Badge>
                                    )) : <p className="text-sm text-muted-foreground">No skills specified.</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 sm:p-10 mt-4 bg-white/5">
                        <div className="flex flex-col sm:flex-row w-full gap-2">
                            {canContact ? (
                                <WhatsAppBookingDialog expert={expert}>
                                    <Button className="flex-1 h-16 rounded-2xl bg-[#25D366] hover:bg-[#20ba56] text-white font-black text-xl shadow-xl shadow-[#25D366]/20 uppercase tracking-widest" size="lg">
                                        <MessageSquare className="mr-2 h-6 w-6" /> WhatsApp Expert
                                    </Button>
                                </WhatsAppBookingDialog>
                            ) : (
                                <div className="w-full bg-orange-500/5 border-2 border-orange-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                                    <div className="bg-orange-500/10 p-4 rounded-full">
                                        <Lock className="h-8 w-8 text-orange-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-xl tracking-tight uppercase italic">Identity Verification Required</h4>
                                        <p className="text-sm text-muted-foreground font-medium max-w-sm mt-1">
                                            {!user ? (
                                                <>Please <Link href="/login" className="text-orange-500 underline underline-offset-4 hover:text-orange-400 font-bold">sign in</Link> to view contact details.</>
                                            ) : !expert.verified ? (
                                                "This professional is currently completing the safety verification process."
                                            ) : (
                                                "Contact information is currently hidden by the professional."
                                            )}
                                        </p>
                                    </div>
                                    {!user && (
                                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl px-10 h-12 shadow-lg shadow-orange-500/20 uppercase tracking-widest">
                                            <Link href="/signup">Join DriveGuru</Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

// Wrapper component to handle Firebase context availability
export default function ExpertProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-[#1a1c23]">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        }>
            <ExpertProfileContent />
        </Suspense>
    );
}
