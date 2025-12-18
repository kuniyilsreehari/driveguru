
"use client";

import { useState, useEffect } from 'react';
import { Plus, Download, FileDown, Phone, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExpertUser } from '@/components/expert-card';
import { useAtom } from 'jotai';
import { installPromptAtom } from '@/lib/store';


interface FloatingActionsProps {
    expert?: ExpertUser;
    isPremium?: boolean;
    isGeneratingPdf?: boolean;
    onDownloadPdf?: () => void;
}

const cleanPhoneNumber = (phoneNumber?: string) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\s+/g, '');
}

export function FloatingActions({ expert, isPremium, isGeneratingPdf, onDownloadPdf }: FloatingActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [installPrompt, setInstallPrompt] = useAtom(installPromptAtom);
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        // Client-side only check
        setCanShare(navigator.share !== undefined);
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

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: expert ? `DriveGuru Expert: ${expert.firstName} ${expert.lastName}` : 'DriveGuru: Find Local Talent Instantly',
                text: expert ? `Check out this expert on DriveGuru!` : 'Find trusted local service professionals and kickstart your career with DriveGuru.',
                url: window.location.href,
            });
        }
    };

    const formattedPhoneNumber = cleanPhoneNumber(expert?.phoneNumber);
    const canCall = expert?.verified && formattedPhoneNumber;
    const canWhatsapp = expert?.verified && formattedPhoneNumber;
    const whatsappLink = `https://wa.me/${formattedPhoneNumber}`;
    const callLink = `tel:${formattedPhoneNumber}`;

    const allActions = [
        ...(installPrompt ? [{
            id: 'install',
            label: 'Install App',
            icon: <Download className="h-6 w-6" />,
            onClick: handleInstallClick,
            enabled: true,
        }] : []),
        ...(isPremium && expert && onDownloadPdf ? [{
            id: 'pdf',
            label: 'Download PDF',
            icon: <FileDown className="h-6 w-6" />,
            onClick: onDownloadPdf,
            enabled: !isGeneratingPdf,
        }] : []),
        ...(expert ? [{
            id: 'call',
            label: 'Call Expert',
            icon: <Phone className="h-6 w-6" />,
            href: callLink,
            enabled: canCall,
        }] : []),
        ...(expert ? [{
            id: 'whatsapp',
            label: 'WhatsApp',
            icon: <MessageCircle className="h-6 w-6" />,
            href: whatsappLink,
            target: "_blank",
            enabled: canWhatsapp,
        }] : []),
        ...(canShare ? [{
            id: 'share',
            label: 'Share',
            icon: <Share2 className="h-6 w-6" />,
            onClick: handleShare,
            enabled: true,
        }] : []),
    ];

    const actions = allActions.filter(action => expert ? true : !['pdf', 'call', 'whatsapp'].includes(action.id));

    if (actions.length === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <div className="fixed bottom-8 right-8 z-50">
                <div className="relative flex flex-col items-center gap-2">
                    {isOpen && actions.map((action, index) => (
                        <div
                            key={action.id}
                            className={cn(
                                "transition-all duration-300",
                                isOpen ? `translate-y-0 opacity-100` : `translate-y-4 opacity-0`,
                            )}
                            style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        asChild={!!action.href}
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-full h-12 w-12 shadow-lg disabled:bg-muted disabled:text-muted-foreground/50"
                                        onClick={action.onClick}
                                        disabled={!action.enabled}
                                        aria-label={action.label}
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
                                <TooltipContent side="left">
                                    <p>{!action.enabled && expert ? `${action.label} (Locked)` : action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ))}
                    
                    <Button
                        size="icon"
                        className="rounded-full h-16 w-16 shadow-xl"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <Plus className={cn("h-8 w-8 transition-transform duration-300", isOpen && "rotate-45")} />
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}
