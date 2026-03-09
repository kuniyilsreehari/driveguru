
'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, IndianRupee, Briefcase, Calendar, Phone, MessageSquare, UserCheck, Crown, Sparkles, MapPin, Lock, List, Share2, Fingerprint, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { FollowerStats } from './follower-stats';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppBookingDialog } from './whatsapp-booking-dialog';
import { ShareDialog } from './share-dialog';
import { useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
    hiddenUntil?: any;
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

    const dgId = `DG-${expert.id.substring(0, 8).toUpperCase()}`;
    
    // Determine if contact actions should be shown
    const canShowContactActions = expert.verified && expert.showPhoneNumberOnProfile && expert.phoneNumber;
    
    return (
        <Card key={expert.id} className="relative overflow-hidden transition-all bg-[#24262d] border-none rounded-[2rem] shadow-2xl hover:shadow-orange-500/5 group">
            <CardContent className="p-6">
                <div className="flex items-start space-x-5">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                        <Avatar className="h-24 w-24 border-4 border-white/10 group-hover:border-orange-500/30 transition-colors shadow-xl">
                            <AvatarImage 
                                src={expert.photoUrl} 
                                alt={getDisplayName(expert)} 
                                onContextMenu={(e) => e.preventDefault()} 
                                draggable={false}
                                className="select-none object-cover"
                            />
                            <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-2xl">{getInitials(expert)}</AvatarFallback>
                        </Avatar>
                    </Link>

                    <div className="flex-1 space-y-1">
                         <div className="flex justify-between items-start">
                            <Link href={`/expert/${expert.id}`} className="block cursor-pointer flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <h3 className="text-xl font-black text-white group-hover:text-orange-500 transition-colors uppercase italic">{getDisplayName(expert)}</h3>
                                    <div className="flex items-center gap-1">
                                        {expert.verified ? <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500/10" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground/40" />}
                                        {expert.tier === 'Premier' && <Crown className="h-4 w-4 text-purple-500 fill-purple-500" />}
                                        {expert.tier === 'Super Premier' && <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500" />}
                                    </div>
                                    {expert.isAvailable && (
                                        <Badge className="bg-green-500 text-white rounded-full px-3 text-[9px] font-black h-5 uppercase tracking-tighter">Available</Badge>
                                    )}
                                    <Badge variant="outline" className="font-mono text-[9px] uppercase border-orange-500/30 bg-orange-500/5 text-orange-500 h-5 px-1.5">
                                        {dgId}
                                    </Badge>
                                </div>
                                {expert.companyName && (
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{`${expert.firstName} ${expert.lastName}`}</p>
                                )}
                                {expert.profession && (
                                    <p className="text-sm font-black text-orange-500 uppercase tracking-tighter">{expert.profession}</p>
                                )}
                                <div className="mt-1">
                                    <FollowerStats expert={expert} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <Badge variant="secondary" className={cn(
                                        "text-white border-none text-[9px] font-black uppercase tracking-widest rounded-full px-3",
                                        expert.role === 'Freelancer' ? "bg-blue-600" :
                                        expert.role === 'Company' ? "bg-indigo-600" :
                                        expert.role === 'Authorized Pro' ? "bg-emerald-600" :
                                        "bg-secondary"
                                    )}>{expert.role}</Badge>
                                </div>
                            </Link>
                            <ShareDialog shareDetails={{ type: 'expert-profile', expertId: expert.id, expertName: getDisplayName(expert) }}>
                                <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 text-white/40 hover:text-white hover:bg-white/5 rounded-full">
                                    <Share2 className="h-5 w-5" />
                                </Button>
                            </ShareDialog>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="flex items-center gap-2 truncate">
                                <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" /> 
                                <span className="truncate">{expert.city || 'Kozhikode, Kera...'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                {expert.pricingValue ? (
                                    <span className="text-white">₹{expert.pricingValue} <span className="text-[9px] opacity-50">/ {expert.pricingModel || 'hr'}</span></span>
                                ) : <span className="opacity-50">N/A</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-orange-500 flex-shrink-0" /> 
                                {expert.yearsOfExperience ? <span className="text-white">{expert.yearsOfExperience} Years</span> : <span className="opacity-50">N/A</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black opacity-30 tracking-tighter">Profile Status</span>
                            </div>
                        </div>
                    </Link>
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                    <Button asChild variant="outline" className="flex-1 h-12 rounded-xl border-white/10 bg-transparent text-white font-black uppercase text-xs tracking-widest hover:bg-white/5">
                        <Link href={`/expert/${expert.id}`}>View Profile</Link>
                    </Button>
                    {canShowContactActions ? (
                        <WhatsAppBookingDialog expert={expert}>
                            <Button className="flex-1 h-12 rounded-xl bg-[#25D366] hover:bg-[#20ba56] text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-[#25D366]/10">
                                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                            </Button>
                        </WhatsAppBookingDialog>
                    ) : (
                         <Button variant="secondary" disabled className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-muted-foreground/50 font-black uppercase text-xs tracking-widest">
                            <Lock className="mr-2 h-4 w-4" /> Contact
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
