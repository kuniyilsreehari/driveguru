'use client';

import { useState } from 'react';
import { Plus, Download, Phone, Share2, MessageSquare, Bot, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAtom } from 'jotai';
import { installPromptAtom, chatOpenAtom, installDialogOpenAtom, currentExpertAtom } from '@/lib/store';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function FloatingActions() {
    const [isOpen, setIsOpen] = useState(false);
    const [installPrompt] = useAtom(installPromptAtom);
    const [, setInstallOpen] = useAtom(installDialogOpenAtom);
    const [, setChatOpen] = useAtom(chatOpenAtom);
    const [expert] = useAtom(currentExpertAtom);

    const firestore = useFirestore();
    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig } = useDoc<any>(appConfigDocRef);
    const centralPhone = appConfig?.centralContactPhone;

    const cleanNumber = (num?: string) => num?.replace(/\s+/g, '') || '';
    const expertPhone = cleanNumber(expert?.phoneNumber);
    const canContactExpert = expert?.verified && expertPhone;

    const actions = [
        {
            id: 'install',
            label: 'INSTALL DRIVEGURU',
            icon: <Download className="h-8 w-8" />,
            onClick: () => { setInstallOpen(true); setIsOpen(false); },
            enabled: !!installPrompt,
            color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
            size: 'h-20 w-20',
            isBig: true,
        },
        {
            id: 'chat',
            label: 'ASK GEMINI AI',
            icon: <Bot className="h-5 w-5" />,
            onClick: () => { setChatOpen(true); setIsOpen(false); },
            enabled: true,
            color: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
            size: 'h-12 w-12',
        },
        {
            id: 'share',
            label: 'SHARE LINK',
            icon: <Share2 className="h-5 w-5" />,
            onClick: () => { 
                if (navigator.share) {
                    navigator.share({ title: 'DriveGuru', url: window.location.href });
                }
            },
            enabled: true,
            color: 'bg-zinc-700 hover:bg-zinc-600',
            size: 'h-12 w-12',
        },
        ...(expert ? [
            {
                id: 'whatsapp',
                label: 'WHATSAPP',
                icon: <MessageSquare className="h-5 w-5" />,
                href: `https://wa.me/${expertPhone}`,
                target: "_blank",
                enabled: canContactExpert,
                color: 'bg-green-500 hover:bg-green-600 shadow-green-500/20',
                size: 'h-12 w-12',
            },
            {
                id: 'call-expert',
                label: 'CALL EXPERT',
                icon: <Phone className="h-5 w-5" />,
                href: `tel:${expertPhone}`,
                enabled: canContactExpert,
                color: 'bg-green-600 hover:bg-green-700 shadow-green-500/20',
                size: 'h-12 w-12',
            }
        ] : []),
        ...(centralPhone ? [{
            id: 'call-support',
            label: 'SUPPORT',
            icon: <Phone className="h-5 w-5" />,
            href: `tel:${cleanNumber(centralPhone)}`,
            enabled: true,
            color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
            size: 'h-12 w-12',
        }] : []),
    ];

    return (
        <div className="fixed bottom-8 right-8 z-[70] flex flex-col items-end gap-4">
            {isOpen && (
                <div className="flex flex-col items-end gap-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {actions.map((action, index) => (
                        <div 
                            key={action.id} 
                            className={cn(
                                "flex items-center gap-3 transition-all duration-300",
                                !action.enabled && "hidden"
                            )}
                            style={{ 
                                transitionDelay: `${index * 50}ms`,
                                transform: isOpen ? 'scale(1)' : 'scale(0.5)' 
                            }}
                        >
                            <span className={cn(
                                "bg-[#1a1c23] text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-2xl border border-white/10",
                                action.isBig && "text-xs py-2 px-4 border-blue-500/30 text-blue-400"
                            )}>
                                {action.label}
                            </span>
                            <Button
                                asChild={!!action.href}
                                variant="default"
                                size="icon"
                                className={cn(
                                    "rounded-full shadow-xl border-2 border-white/10 transition-all active:scale-95",
                                    action.color,
                                    action.size
                                )}
                                onClick={action.onClick}
                            >
                                {action.href ? (
                                    <a href={action.href} target={action.target} rel="noopener noreferrer">
                                        {action.icon}
                                    </a>
                                ) : (
                                    action.icon
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            
            <Button
                size="icon"
                className={cn(
                    "rounded-full h-16 w-16 shadow-2xl transition-all duration-500 border-4 border-white/10",
                    isOpen ? "bg-[#1a1c23] text-white rotate-45" : "bg-yellow-400 text-black hover:bg-yellow-500 scale-110"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
            </Button>
        </div>
    );
}