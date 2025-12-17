
'use client';

import { Suspense, useState, useRef } from 'react';
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
    expertId: string;
    expertName: string;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number; nanoseconds: number; };
    status: 'pending' | 'approved' | 'rejected';
};

function ExpertProfileContent() {
    const params = useParams();
    const expertId = params.expertId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const profileCardRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewerName, setReviewerName] = useState('');
    const [comment, setComment] = useState('');

    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);

    const reviewsQuery = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return query(
            collection(firestore, 'reviews'), 
            where('expertId', '==', expertId), 
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, expertId]);

    const { data: expert, isLoading: isLoadingExpert } = useDoc<ExpertUserProfile>(expertDocRef);
    const { data: reviews, isLoading: isLoadingReviews } = useCollection<Review>(reviewsQuery);

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


    const handleSubmitReview = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: "Error", description: "Database connection not found." });
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: "Not logged in", description: "You must be logged in to leave a review." });
            return;
        }

        if (reviewerName.trim() === '' || comment.trim() === '' || rating === 0) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill out all fields to submit a review." });
            return;
        }
        
        const reviewsCollectionRef = collection(firestore, 'reviews');
        
        const reviewData = {
            expertId: expertId,
            expertName: displayName,
            reviewerId: user.uid,
            reviewerName: reviewerName,
            rating: rating,
            comment: comment,
            createdAt: serverTimestamp(),
            status: 'pending'
        };
        
        await addDocumentNonBlocking(reviewsCollectionRef, reviewData);

        toast({ title: "Review Submitted", description: "Your review is pending approval. Thank you!" });
        // Reset form
        setRating(0);
        setReviewerName('');
        setComment('');
        setIsReviewOpen(false);
    }


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
                        <CardTitle className="flex items-center gap-2 text-xl"><MessageSquare className="h-5 w-5" /> Customer Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Collapsible open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                            {user && expert.verified && (
                                <CollapsibleTrigger asChild>
                                     <Button variant="outline"><Edit2 className="mr-2 h-4 w-4" />Leave a Review</Button>
                                </CollapsibleTrigger>
                            )}
                             {!expert.verified && user && (
                                 <Button variant="outline" disabled>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Reviewing is locked until expert is verified
                                </Button>
                            )}
                            <CollapsibleContent className="pt-6">
                                <div className="p-6 bg-card-foreground/5 dark:bg-card-foreground/10 border rounded-lg">
                                    <h4 className="text-lg font-bold mb-4">Write your review for {displayName}</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor={`reviewerName-${expert.id}`}>Your Name</Label>
                                            <Input 
                                                id={`reviewerName-${expert.id}`}
                                                placeholder="e.g. Jane Doe" 
                                                value={reviewerName}
                                                onChange={(e) => setReviewerName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Rating</Label>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "h-6 w-6 cursor-pointer",
                                                            (hoverRating >= star || rating >= star)
                                                                ? "text-yellow-400 fill-yellow-400"
                                                                : "text-gray-400"
                                                        )}
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        onClick={() => setRating(star)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor={`comment-${expert.id}`}>Comment</Label>
                                            <Textarea
                                                id={`comment-${expert.id}`}
                                                placeholder="Share your experience..."
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                            />
                                        </div>
                                        <Button className="w-full" onClick={handleSubmitReview}>
                                            <Send className="mr-2 h-4 w-4" /> Submit Review
                                        </Button>
                                    </div>
                                </div>
                            </CollapsibleContent>
                            
                            {isLoadingReviews ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <p className="ml-3 text-muted-foreground">Loading reviews...</p>
                                </div>
                            ) : reviews && reviews.length > 0 ? (
                                <div className="space-y-4 mt-6">
                                    {reviews.map(review => (
                                        <Card key={review.id} className="bg-background/50">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{review.reviewerName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">&quot;{review.comment}&quot;</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground mt-4">
                                    <p>No approved reviews for this expert yet. Be the first!</p>
                                </div>
                            )}
                        </Collapsible>
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
