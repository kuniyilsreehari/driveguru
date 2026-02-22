
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

type ShareDetails = 
    | { type: 'expert-profile'; expertId: string; expertName: string; }
    | { type: 'group-post'; title: string; text: string; url: string; }
    | { type: 'vacancy'; vacancyId: string; vacancyTitle: string; companyName: string; };

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
    } else if (shareDetails.type === 'vacancy') {
        const vacancyUrl = `${window.location.origin}/vacancies#${shareDetails.vacancyId}`;
        shareData = {
            title: `Job Opening: ${shareDetails.vacancyTitle} at ${shareDetails.companyName}`,
            text: `Check out this job opening for a ${shareDetails.vacancyTitle} at ${shareDetails.companyName} on DriveGuru!`,
            url: vacancyUrl
        };
        dialogTitle = 'Share Vacancy';
        dialogDescription = `Share this job opportunity with others.`;
    } else { // group-post
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
                // User gesture is present via onClick
                await navigator.share(shareData);
            } else {
                await handleCopyLink();
            }
        } catch (err: any) {
            // NotAllowedError is common in sandboxed environments or if permission is denied
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
                await handleCopyLink();
                toast({
                    title: "Link Copied",
                    description: "Native sharing is restricted in this browser. Link copied instead.",
                });
            } else if (err.name !== 'AbortError') {
                console.error("Share failed:", err);
                await handleCopyLink();
            }
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Button onClick={handleNativeShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share via System
                    </Button>
                    <Button variant="outline" onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
