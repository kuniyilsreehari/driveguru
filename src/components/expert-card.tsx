'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Briefcase, Phone, MessageSquare, Crown, Sparkles, MapPin, Lock, Share2, ShieldCheck, ShieldAlert, Fingerprint } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { FollowerStats } from './follower-stats';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppBookingDialog } from './whatsapp-booking-dialog';
import { ShareDialog } from './share-dialog';
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
    skills?: string;
    qualification?: string;
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

    const dgId = `DG-${expert.id.substring(0, 8).toUpperCase()}`;
    
    const canShowContactActions = expert.verified && expert.showPhoneNumberOnProfile && expert.phoneNumber;
    
    return (
        <Card className="relative overflow-hidden transition-all bg-card border-border rounded-[2.5rem] shadow-2xl hover:shadow-orange-500/5 group">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer shrink-0">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-border/50 group-hover:border-orange-500/30 transition-colors shadow-xl">
                            <AvatarImage 
                                src={expert.photoUrl} 
                                alt={getDisplayName(expert)} 
                                onContextMenu={(e) => e.preventDefault()} 
                                draggable={false}
                                className="select-none object-cover"
                            />
                            <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xl">{getInitials(expert)}</AvatarFallback>
                        </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                            <Link href={`/expert/${expert.id}`} className="block cursor-pointer flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg sm:text-2xl font-black text-foreground group-hover:text-orange-500 transition-colors uppercase italic tracking-tighter leading-tight truncate">
                                        {getDisplayName(expert)}
                                    </h3>
                                    {expert.verified && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 fill-green-500/10" />}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {expert.tier === 'Premier' && <Crown className="h-4 w-4 text-purple-500 fill-purple-500/20" />}
                                    {expert.tier === 'Super Premier' && <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500/20" />}
                                    
                                    {expert.isAvailable && (
                                        <Badge className="bg-[#22c55e] text-white rounded-full px-2 text-[8px] font-black h-5 uppercase tracking-tighter border-none shadow-sm">Available</Badge>
                                    )}
                                    
                                    <Badge variant="outline" className="font-mono text-[8px] uppercase border-orange-500/30 bg-orange-500/5 text-orange-500 h-5 px-1.5">
                                        <Fingerprint className="h-2.5 w-2.5 mr-1 opacity-50" /> {dgId}
                                    </Badge>
                                </div>

                                {expert.companyName && (
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                                        {expert.firstName} {expert.lastName}
                                    </p>
                                )}

                                <div className="mt-1">
                                    <FollowerStats expert={expert} />
                                </div>

                                <div className="mt-3">
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none text-[9px] font-black uppercase tracking-widest rounded-full px-4 h-6 shadow-lg shadow-blue-600/20">
                                        {expert.role || 'Freelancer'}
                                    </Badge>
                                </div>
                            </Link>
                            
                            <ShareDialog shareDetails={{ type: 'expert-profile', expertId: expert.id, expertName: getDisplayName(expert) }}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-foreground hover:bg-muted rounded-full">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </ShareDialog>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-5 bg-background rounded-3xl border border-border shadow-inner space-y-4">
                    <Link href={`/expert/${expert.id}`} className="block cursor-pointer">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-orange-500 shrink-0" /> 
                                <span className="truncate">{expert.city || 'Kozhikode'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-orange-500 shrink-0" />
                                {expert.pricingValue ? (
                                    <span className="text-foreground">₹{expert.pricingValue} <span className="text-[8px] opacity-40">/ {expert.pricingModel || 'hr'}</span></span>
                                ) : <span className="opacity-40 italic">N/A</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-orange-500 shrink-0" /> 
                                {expert.yearsOfExperience ? <span className="text-foreground">{expert.yearsOfExperience} Years</span> : <span className="opacity-40 italic">N/A</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black opacity-20 tracking-widest">Profile Status</span>
                            </div>
                        </div>
                    </Link>
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                    <Button asChild variant="outline" className="flex-1 h-14 rounded-2xl border-border bg-background text-foreground font-black uppercase text-xs tracking-widest hover:bg-muted shadow-xl transition-all active:scale-95">
                        <Link href={`/expert/${expert.id}`}>View Profile</Link>
                    </Button>
                    
                    {canShowContactActions ? (
                        <WhatsAppBookingDialog expert={expert}>
                            <Button className="flex-1 h-14 rounded-2xl bg-[#22c55e] hover:bg-[#1eb054] text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-[#22c55e]/20 transition-all active:scale-95">
                                <MessageSquare className="mr-2 h-5 w-5" /> WhatsApp
                            </Button>
                        </WhatsAppBookingDialog>
                    ) : (
                         <Button variant="secondary" disabled className="flex-1 h-14 rounded-2xl bg-muted border border-border text-muted-foreground/30 font-black uppercase text-xs tracking-widest">
                            <Lock className="mr-2 h-4 w-4" /> Contact
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
