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
            <DialogContent className="sm:max-w-md bg-background border-none rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-white font-black">{dialogTitle}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Button onClick={handleNativeShare} className="bg-orange-500 hover:bg-orange-600 h-12 rounded-xl font-bold">
                        <Share2 className="mr-2 h-4 w-4" /> Share via System
                    </Button>
                    <Button variant="outline" onClick={handleCopyLink} className="h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold">
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
