
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, IndianRupee, Briefcase, Calendar, Phone, MessageCircle, ChevronDown, UserCheck, Crown, Sparkles, MapPin, Send, MessageSquare as MessageSquareIcon, Edit2, XCircle, Lock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';


export type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    location?: string;
    role?: string;
    verified?: boolean;
    hourlyRate?: number;
    yearsOfExperience?: number;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    photoUrl?: string;
    isAvailable?: boolean;
    phoneNumber?: string;
};

interface ExpertCardProps {
    expert: ExpertUser;
}

export function ExpertCard({ expert }: ExpertCardProps) {
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewerName, setReviewerName] = useState('');
    const [comment, setComment] = useState('');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const getInitials = (expert: ExpertUser) => {
        if (expert.companyName) {
            return expert.companyName.substring(0, 2).toUpperCase();
        }
        if (expert.firstName && expert.lastName) {
            return `${expert.firstName.charAt(0)}${expert.lastName.charAt(0)}`.toUpperCase();
        }
        if (expert.firstName) {
            return expert.firstName.charAt(0).toUpperCase();
        }
        return 'U';
    };

    const getDisplayName = (expert: ExpertUser) => {
        return expert.companyName || `${expert.firstName} ${expert.lastName}`;
    }

    const cleanPhoneNumber = (phoneNumber?: string) => {
        if (!phoneNumber) return '';
        return phoneNumber.replace(/\s+/g, '');
    }

    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);

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
            expertId: expert.id,
            expertName: getDisplayName(expert),
            reviewerId: user.uid,
            reviewerName: reviewerName,
            rating: rating,
            comment: comment,
            createdAt: serverTimestamp(),
            status: 'pending'
        };
        
        addDocumentNonBlocking(reviewsCollectionRef, reviewData);

        toast({ title: "Review Submitted", description: "Your review is pending approval. Thank you!" });
        // Reset form
        setRating(0);
        setReviewerName('');
        setComment('');
        setIsReviewOpen(false);
    }

    return (
        <Collapsible open={isReviewOpen} onOpenChange={setIsReviewOpen}>
             <Card key={expert.id} className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                {expert.isAvailable && (
                    <Badge className="absolute top-4 right-4 bg-green-500 text-white">Available</Badge>
                )}
                <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                        <Link href={`/expert/${expert.id}`} className="block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <Avatar className="h-20 w-20 text-3xl">
                                <AvatarImage src={expert.photoUrl} alt={getDisplayName(expert)} />
                                <AvatarFallback>{getInitials(expert)}</AvatarFallback>
                            </Avatar>
                        </Link>

                        <div className="flex-1">
                            <Link href={`/expert/${expert.id}`} className="block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-xl font-bold">{getDisplayName(expert)}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
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
                                    {expert.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                    {expert.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
                                    <span className="text-xs text-muted-foreground ml-1">(1 review)</span>
                                </div>
                            </Link>

                            <Separator className="my-3" />
                            
                             <Link href={`/expert/${expert.id}`} className="block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 truncate"><MapPin className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{expert.location || 'N/A'}</span></div>
                                    <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 flex-shrink-0" /> {expert.hourlyRate ? `${expert.hourlyRate}/hr` : 'N/A'}</div>
                                    <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 flex-shrink-0" /> {expert.yearsOfExperience ? `${expert.yearsOfExperience} years` : 'N/A'}</div>
                                    <div className="flex items-center gap-2"><Badge variant="secondary" className="truncate">{expert.role}</Badge></div>
                                </div>
                            </Link>
                        </div>
                    </div>
                    
                    <Separator className="my-4" />

                    <div className="flex flex-wrap items-center gap-2">
                         {user && expert.verified && (
                             <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}><Edit2 className="mr-2 h-4 w-4" />Leave a Review</Button>
                            </CollapsibleTrigger>
                        )}
                        <div className="flex-grow"></div>
                        {expert.verified ? (
                            <>
                                <Button asChild size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}><Link href={`/expert/${expert.id}/book`}><Calendar className="mr-2 h-4 w-4" /> Book</Link></Button>
                                <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600" disabled={!formattedPhoneNumber} onClick={(e) => e.stopPropagation()}>
                                    <a href={`tel:${formattedPhoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                                </Button>
                                <Button asChild size="sm" className="bg-green-500 hover:bg-green-600" disabled={!formattedPhoneNumber} onClick={(e) => e.stopPropagation()}>
                                    <a href={`https://wa.me/${formattedPhoneNumber}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
                                </Button>
                            </>
                        ) : (
                             <Button variant="secondary" disabled size="sm">
                                <Lock className="mr-2 h-4 w-4" /> Contact actions locked
                            </Button>
                        )}
                    </div>
                </CardContent>
                <CollapsibleContent>
                    <div className="p-6 bg-card-foreground/5 dark:bg-card-foreground/10 border-t" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquareIcon className="h-6 w-6 text-primary"/>
                            <h4 className="text-xl font-bold">Leave a Review for {getDisplayName(expert)}</h4>
                        </div>
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
            </Card>
        </Collapsible>
    )
}

    
