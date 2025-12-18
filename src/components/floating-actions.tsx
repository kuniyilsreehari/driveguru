
"use client";

import { useState, useEffect } from 'react';
import { Plus, Download, FileDown, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExpertUser } from '@/components/expert-card';

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
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        (installPrompt as any).prompt();
        (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
            setInstallPrompt(null);
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
    const canShare = navigator.share !== undefined;

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
            icon: <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.447-4.435-9.884-9.888-9.884-5.448 0-9.886 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>,
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

    return (
        <TooltipProvider>
            <div className="fixed bottom-8 right-8 z-50">
                <div className="relative flex flex-col items-center gap-2">
                    {actions.map((action, index) => (
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
