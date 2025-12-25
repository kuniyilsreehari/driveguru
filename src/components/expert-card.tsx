
'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, IndianRupee, Briefcase, Calendar, Phone, MessageCircle, UserCheck, Crown, Sparkles, MapPin, Lock, List, Share2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { FollowerStats } from './follower-stats';
import { useToast } from '@/hooks/use-toast';

export type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    businessDescription?: string;
    email?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    role?: string;
    category?: string;
    verified?: boolean;
    hourlyRate?: number;
    yearsOfExperience?: number;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    photoUrl?: string;
    isAvailable?: boolean;
    phoneNumber?: string;
    showPhoneNumberOnProfile?: boolean;
    following?: string[];
};

interface ExpertCardProps {
    expert: ExpertUser;
}

export function ExpertCard({ expert }: ExpertCardProps) {
    const { user } = useUser();
    const { toast } = useToast();

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

    const handleShare = async () => {
        const shareData = {
            title: `Check out ${getDisplayName(expert)} on DriveGuru`,
            text: `I found this expert, ${getDisplayName(expert)}, on DriveGuru. Here's their profile:`,
            url: `${window.location.origin}/expert/${expert.id}`
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for browsers that don't support Web Share API
                await navigator.clipboard.writeText(shareData.url);
                toast({
                    title: "Link Copied",
                    description: "The link to this expert's profile has been copied to your clipboard.",
                });
            }
        } catch (err) {
            console.error("Share failed:", err);
            toast({
                variant: 'destructive',
                title: "Share Failed",
                description: "Could not share the profile at this time.",
            });
        }
    };

    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);
    const locationString = [expert.city, expert.state, expert.pincode].filter(Boolean).join(', ');
    
    // Determine if contact actions should be shown
    const canShowContactActions = expert.verified && expert.showPhoneNumberOnProfile && formattedPhoneNumber;

    return (
        <Card key={expert.id} className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
            {expert.isAvailable && (
                <Badge className="absolute top-4 right-4 bg-green-500 text-white">Available</Badge>
            )}
            <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                        <Avatar className="h-20 w-20 text-3xl">
                            <AvatarImage src={expert.photoUrl} alt={getDisplayName(expert)} />
                            <AvatarFallback>{getInitials(expert)}</AvatarFallback>
                        </Avatar>
                    </Link>

                    <div className="flex-1">
                        <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                             <h3 className="text-xl font-bold">{getDisplayName(expert)}</h3>
                             {expert.companyName && (
                                <p className="text-sm text-muted-foreground">{`${expert.firstName} ${expert.lastName}`}</p>
                            )}
                            {expert.businessDescription && <p className="text-sm text-muted-foreground mt-1">{expert.businessDescription}</p>}
                            <div className="mt-1">
                                <FollowerStats expert={expert} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {expert.verified ? (
                                    <Badge variant="outline" className="border-green-500 text-green-500">
                                        <UserCheck className="mr-1 h-3 w-3" />
                                        Verified
                                    </Badge>
                                ) : (
                                     <Badge variant="destructive">Not Verified</Badge>
                                )}
                                {expert.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                {expert.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                                {expert.category && <Badge variant="secondary"><List className="mr-1 h-3 w-3" />{expert.category}</Badge>}
                            </div>
                        </Link>

                        <Separator className="my-3" />
                        
                         <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 truncate"><MapPin className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{locationString || 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 flex-shrink-0" /> {expert.hourlyRate ? `${expert.hourlyRate}/hr` : 'N/A'}</div>
                                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 flex-shrink-0" /> {expert.yearsOfExperience ? `${expert.yearsOfExperience} years` : 'N/A'}</div>
                                <div className="flex items-center gap-2"><Badge variant="secondary" className="truncate">{expert.role}</Badge></div>
                            </div>
                        </Link>
                    </div>
                </div>
                
                <Separator className="my-4" />

                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/expert/${expert.id}`}>View Profile</Link>
                    </Button>
                     <Button size="sm" variant="outline" className="flex-1" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <div className="flex flex-1 gap-2">
                    {canShowContactActions ? (
                        <>
                            <Button asChild size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600">
                                <a href={`tel:${formattedPhoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                            </Button>
                            <Button asChild size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                                <a href={`https://wa.me/${formattedPhoneNumber}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
                            </Button>
                        </>
                    ) : (
                         <Button variant="secondary" disabled size="sm" className="w-full">
                            <Lock className="mr-2 h-4 w-4" /> Contact actions locked
                        </Button>
                    )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
