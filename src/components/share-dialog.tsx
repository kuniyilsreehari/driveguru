'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy } from 'lucide-react';

type ShareDetails = 
    | { type: 'expert-profile'; expertId: string; expertName: string; }
    | { type: 'vacancy'; vacancyId: string; vacancyTitle: string; companyName: string; }
    | { type: 'group-post'; title: string; text: string; url: string; };

interface ShareDialogProps {
  shareDetails: ShareDetails;
  children: React.ReactNode;
}

export function ShareDialog({ shareDetails, children }: ShareDialogProps) {
    const { toast } = useToast();
    const [origin, setOrigin] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
            setIsMounted(true);
        }
    }, []);
    
    if (!isMounted) return <>{children}</>;

    let shareData: { title: string; text: string; url: string; } = { title: '', text: '', url: '' };
    let dialogTitle: string = '';
    let dialogDescription: string = '';

    if (shareDetails.type === 'expert-profile') {
        const profileUrl = `${origin}/expert/${shareDetails.expertId}`;
        shareData = {
            title: `Check out ${shareDetails.expertName} on DriveGuru`,
            text: `I found this expert, ${shareDetails.expertName}, on DriveGuru. Here's their profile:`,
            url: profileUrl
        };
        dialogTitle = 'Share Profile';
        dialogDescription = `Share ${shareDetails.expertName}'s profile with others.`;
    } else if (shareDetails.type === 'vacancy') {
        const vacancyUrl = `${origin}/vacancies#${shareDetails.vacancyId}`;
        shareData = {
            title: `Job Opening: ${shareDetails.vacancyTitle} at ${shareDetails.companyName}`,
            text: `Check out this job opening on DriveGuru: ${shareDetails.vacancyTitle} at ${shareDetails.companyName}`,
            url: vacancyUrl
        };
        dialogTitle = 'Share Job Opening';
        dialogDescription = `Share the position for ${shareDetails.vacancyTitle} with your network.`;
    } else if (shareDetails.type === 'group-post') {
        shareData = {
            title: shareDetails.title,
            text: shareDetails.text,
            url: shareDetails.url
        };
        dialogTitle = 'Share Post';
        dialogDescription = 'Share this post with others.';
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareData.url);
            toast({
                title: "Link Copied",
                description: "The link has been copied to your clipboard.",
            });
        } catch (err) {
            console.error("Clipboard failed:", err);
        }
    }

    const handleNativeShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await handleCopyLink();
            }
        } catch (err: any) {
            console.warn("Native share failed, falling back to clipboard:", err.message);
            await handleCopyLink();
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#1a1c23] border-none rounded-[2.5rem] shadow-2xl p-8">
                <DialogHeader className="items-center text-center">
                    <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4">
                        <Share2 className="h-10 w-10 text-orange-500" />
                    </div>
                    <DialogTitle className="text-3xl font-black text-white">{dialogTitle}</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium pt-2">{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-6">
                    <Button onClick={handleNativeShare} className="bg-orange-500 hover:bg-orange-600 h-14 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20">
                        <Share2 className="mr-2 h-5 w-5" /> Share via System
                    </Button>
                    <Button variant="outline" onClick={handleCopyLink} className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 font-bold text-white">
                        <Copy className="mr-2 h-5 w-5" /> Copy Secure Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
