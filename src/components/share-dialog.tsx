

'use client';

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
import type { ExpertUser } from './expert-card';

type ShareDetails = 
    | { type: 'expert-profile'; expertId: string; expertName: string; }
    | { type: 'group-post'; title: string; text: string; url: string; };

interface ShareDialogProps {
  shareDetails: ShareDetails;
  children: React.ReactNode;
}

export function ShareDialog({ shareDetails, children }: ShareDialogProps) {
    const { toast } = useToast();
    
    let shareData: { title: string; text: string; url: string; };
    let dialogTitle: string;
    let dialogDescription: string;

    if (shareDetails.type === 'expert-profile') {
        const profileUrl = `${window.location.origin}/expert/${shareDetails.expertId}`;
        shareData = {
            title: `Check out ${shareDetails.expertName} on DriveGuru`,
            text: `I found this expert, ${shareDetails.expertName}, on DriveGuru. Here's their profile:`,
            url: profileUrl
        };
        dialogTitle = 'Share Profile';
        dialogDescription = `Share ${shareDetails.expertName}'s profile with others.`;
    } else { // group-post
        shareData = {
            title: shareDetails.title,
            text: shareDetails.text,
            url: shareDetails.url
        };
        dialogTitle = 'Share Post';
        dialogDescription = 'Share this post with others.';
    }


    const handleNativeShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                 // Fallback for browsers that don't support navigator.share
                await navigator.clipboard.writeText(shareData.url);
                toast({
                    title: "Link Copied",
                    description: "The link has been copied to your clipboard.",
                });
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Share failed:", err);
                toast({
                    variant: 'destructive',
                    title: "Share Failed",
                    description: "Could not share at this time.",
                });
            }
        }
    };
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareData.url);
        toast({
            title: "Link Copied",
            description: "The link has been copied to your clipboard.",
        });
    }

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    {typeof navigator !== 'undefined' && navigator.share && (
                        <Button onClick={handleNativeShare}>
                            <Share2 className="mr-2 h-4 w-4" /> Share via...
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
