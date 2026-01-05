
'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, IndianRupee, Briefcase, Calendar, Phone, MessageSquare, UserCheck, Crown, Sparkles, MapPin, Lock, List, Share2 } from 'lucide-react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { FollowerStats } from './follower-stats';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppBookingDialog } from './whatsapp-booking-dialog';
import { ShareDialog } from './share-dialog';
import { useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

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
    profession?: string;
    verified?: boolean;
    pricingModel?: string;
    pricingValue?: number;
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
    const router = useRouter();
    const firestore = useFirestore();

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

    const locationString = [expert.city, expert.state, expert.pincode].filter(Boolean).join(', ');
    
    // Determine if contact actions should be shown
    const canShowContactActions = expert.verified && expert.showPhoneNumberOnProfile && expert.phoneNumber;
    
    return (
        <Card key={expert.id} className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
            <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                        <Avatar className="h-20 w-20 text-3xl">
                            <AvatarImage src={expert.photoUrl} alt={getDisplayName(expert)} />
                            <AvatarFallback>{getInitials(expert)}</AvatarFallback>
                        </Avatar>
                    </Link>

                    <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <Link href={`/expert/${expert.id}`} className="block cursor-pointer flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <h3 className="text-xl font-bold">{getDisplayName(expert)}</h3>
                                    {expert.isAvailable && (
                                        <Badge className="bg-green-500 text-white">Available</Badge>
                                    )}
                                </div>
                                {expert.companyName && (
                                    <p className="text-sm text-muted-foreground">{`${expert.firstName} ${expert.lastName}`}</p>
                                )}
                                {expert.profession && (
                                    <p className="text-sm font-semibold text-primary">{expert.profession}</p>
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
                            <ShareDialog shareDetails={{ type: 'expert-profile', expertId: expert.id, expertName: getDisplayName(expert) }}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </ShareDialog>
                        </div>

                        <Separator className="my-3" />
                        
                         <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 truncate"><MapPin className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{locationString || 'N/A'}</span></div>
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4 flex-shrink-0" />
                                    {expert.pricingValue ? (
                                        <span>{`₹${expert.pricingValue}`} {expert.pricingModel && `/ ${expert.pricingModel}`}</span>
                                    ) : 'N/A'}
                                </div>
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
                    <div className="flex flex-1 gap-2">
                    {canShowContactActions ? (
                        <WhatsAppBookingDialog expert={expert}>
                            <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                            </Button>
                        </WhatsAppBookingDialog>
                    ) : (
                         <Button variant="secondary" disabled size="sm" className="w-full">
                            <Lock className="mr-2 h-4 w-4" /> Contact
                        </Button>
                    )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
