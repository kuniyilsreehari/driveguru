
"use client";

import { useState, useEffect } from 'react';
import { Plus, Download, Phone, Share2, MessageCircle, MessageSquare, Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExpertUser } from '@/components/expert-card';
import { useAtom } from 'jotai';
import { installPromptAtom, chatOpenAtom } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface FloatingActionsProps {
    expert?: ExpertUser;
}

const cleanPhoneNumber = (phoneNumber?: string) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\s+/g, '');
}

export function FloatingActions({ expert }: FloatingActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [installPrompt, setInstallPrompt] = useAtom(installPromptAtom);
    const [, setChatOpen] = useAtom(chatOpenAtom);
    const [canShare, setCanShare] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setCanShare(typeof navigator !== 'undefined' && (!!navigator.share || !!navigator.clipboard));
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        (installPrompt as any).prompt();
        (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
            if (choiceResult.outcome === 'accepted') {
                 setInstallPrompt(null);
            }
        });
    };

    const getDisplayName = (expert?: ExpertUser) => {
        if (!expert) return 'DriveGuru';
        return expert.companyName || `${expert.firstName} ${expert.lastName}`;
    }

    const handleShare = async () => {
        const shareData = {
            title: `Check out ${getDisplayName(expert)} on DriveGuru`,
            text: `I found this expert, ${getDisplayName(expert)}, on DriveGuru. Here's their profile:`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toast({
                    title: "Link Copied",
                    description: "The link to the profile has been copied to your clipboard.",
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

    const formattedPhoneNumber = cleanPhoneNumber(expert?.phoneNumber);
    const canContact = expert?.verified && formattedPhoneNumber;
    const whatsappLink = `https://wa.me/${formattedPhoneNumber}`;
    const callLink = `tel:${formattedPhoneNumber}`;

    const actions = [
        ...(installPrompt ? [{
            id: 'install',
            label: 'Install App',
            icon: <Download className="h-5 w-5" />,
            onClick: handleInstallClick,
            enabled: true,
            color: 'bg-blue-600 hover:bg-blue-700',
        }] : []),
        {
            id: 'chat',
            label: 'Ask Gemini AI',
            icon: <Bot className="h-5 w-5" />,
            onClick: () => { setChatOpen(true); setIsOpen(false); },
            enabled: true,
            color: 'bg-orange-500 hover:bg-orange-600', // Orange as per design
        },
        ...(expert ? [
            {
                id: 'whatsapp',
                label: 'WhatsApp Expert',
                icon: <MessageSquare className="h-5 w-5" />,
                href: whatsappLink,
                target: "_blank",
                enabled: canContact,
                color: 'bg-green-500 hover:bg-green-600', // Green as per design
            },
            {
                id: 'call',
                label: 'Call Expert',
                icon: <Phone className="h-5 w-5" />,
                href: callLink,
                enabled: canContact,
                color: 'bg-green-600 hover:bg-green-700',
            }
        ] : []),
        ...(canShare ? [{
            id: 'share',
            label: 'Share Profile',
            icon: <Share2 className="h-5 w-5" />,
            onClick: handleShare,
            enabled: true,
            color: 'bg-zinc-700 hover:bg-zinc-800',
        }] : []),
    ];

    return (
        <TooltipProvider>
            <div className="fixed bottom-8 right-8 z-[70] flex flex-col items-end gap-3">
                {isOpen && (
                    <div className="flex flex-col items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {actions.map((action, index) => (
                            <Tooltip key={action.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        asChild={!!action.href}
                                        variant="default"
                                        size="icon"
                                        className={cn(
                                            "rounded-full h-12 w-12 shadow-xl border-2 border-white/10 transition-all active:scale-95",
                                            action.color,
                                            !action.enabled && "opacity-50 grayscale cursor-not-allowed"
                                        )}
                                        onClick={action.onClick}
                                        disabled={!action.enabled}
                                        style={{ 
                                            transitionDelay: `${index * 50}ms`,
                                            transform: isOpen ? 'scale(1)' : 'scale(0.5)' 
                                        }}
                                    >
                                        {action.href ? (
                                            <a href={action.enabled ? action.href : undefined} target={action.target} rel="noopener noreferrer">
                                                {action.icon}
                                            </a>
                                        ) : (
                                            action.icon
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-[#1a1c23] border-white/10 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-2xl">
                                    {action.label} {!action.enabled && '(Verified Only)'}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )}
                
                <Button
                    size="icon"
                    className={cn(
                        "rounded-full h-16 w-16 shadow-2xl transition-all duration-500 border-4 border-white/10",
                        isOpen ? "bg-[#1a1c23] text-white rotate-45" : "bg-orange-500 text-white hover:bg-orange-600 scale-110"
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Plus className="h-8 w-8" />
                </Button>
            </div>
        </TooltipProvider>
    );
}
