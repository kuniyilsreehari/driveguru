
'use client';

import { Suspense, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Loader2, Star, ChevronLeft, MapPin, IndianRupee, Briefcase, Calendar, Info, Book, GraduationCap, School, User as UserIcon, UserCheck, XCircle, Crown, Sparkles, MessageSquare, LogIn, Edit2, Send, Lock, Building, FileDown, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
    location?: string;
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

type Review = {
    id: string;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number, nanoseconds: number };
};

function ReviewForm({ expertId, expertName }: { expertId: string, expertName: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewerName, setReviewerName] = useState(user?.displayName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        if (comment.length < 10) {
            toast({ variant: 'destructive', title: 'Comment too short', description: 'Please provide more details in your review.' });
            return;
        }
        if (rating === 0) {
            toast({ variant: 'destructive', title: 'No rating selected', description: 'Please select a star rating.' });
            return;
        }

        setIsSubmitting(true);
        const reviewsCollectionRef = collection(firestore, 'reviews');
        const newReviewData = {
            expertId,
            expertName,
            reviewerName: reviewerName || 'Anonymous',
            rating,
            comment,
            status: 'pending',
            createdAt: serverTimestamp(),
            userId: user.uid,
        };

        try {
            await addDocumentNonBlocking(reviewsCollectionRef, newReviewData);
            toast({ title: 'Review Submitted', description: 'Your review is pending approval. Thank you!' });
            setComment('');
            setRating(0);
            setReviewerName(user.displayName || '');
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h4 className="font-semibold text-lg">Leave a Review</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="reviewerName">Your Name</Label>
                    <Input id="reviewerName" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                    <Label>Your Rating</Label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn("h-6 w-6 cursor-pointer transition-colors", star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400")}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="comment">Your Comment</Label>
                <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`Share your experience with ${expertName}...`} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : <><Send className="mr-2 h-4 w-4" /> Submit Review</>}
            </Button>
        </form>
    );
}

function ReviewsList({ expertId }: { expertId: string }) {
    const firestore = useFirestore();

    const reviewsQuery = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return query(
            collection(firestore, 'reviews'),
            where('expertId', '==', expertId),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, expertId]);

    const { data: reviews, isLoading } = useCollection<Review>(reviewsQuery);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading reviews...</span>
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return <p className="text-muted-foreground text-sm">No approved reviews yet for this expert.</p>;
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                        <AvatarFallback>{review.reviewerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold">{review.reviewerName}</p>
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true })}
                            </span>
                        </div>
                         <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                    </div>
                </div>
            ))}
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

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-8">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    {isPremium ? (
                         <Button variant="outline" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                            {isGeneratingPdf ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="mr-2 h-4 w-4" />
                            )}
                            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </Button>
                    ) : (
                         <Button variant="outline" disabled>
                            <Lock className="mr-2 h-4 w-4" />
                            Download PDF (Premium)
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
                                 <div className="mt-4">
                                     {expert.verified ? (
                                        <Button asChild variant="secondary"><Link href={`/expert/${expert.id}/book`}><Calendar className="mr-2 h-4 w-4" /> Book Appointment</Link></Button>
                                     ) : (
                                        <Button variant="secondary" disabled>
                                            <Lock className="mr-2 h-4 w-4" /> Appointment booking locked
                                        </Button>
                                     )}
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
                                <p><span className="font-semibold">Location:</span> {expert.location || 'Not specified'}</p>
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <MessageSquare />
                            Customer Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ReviewsList expertId={expert.id} />
                        <Separator />
                        {user && user.uid !== expert.id ? (
                            <ReviewForm expertId={expert.id} expertName={displayName} />
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">
                                {user ? "You cannot review your own profile." : "Please log in to leave a review."}
                            </p>
                        )}
                    </CardContent>
                </Card>

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
