
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

interface ShareDialogProps {
  expertId: string;
  expertName: string;
  children: React.ReactNode;
}

export function ShareDialog({ expertId, expertName, children }: ShareDialogProps) {
    const { toast } = useToast();
    const profileUrl = `${window.location.origin}/expert/${expertId}`;

    const handleNativeShare = async () => {
        const shareData = {
            title: `Check out ${expertName} on DriveGuru`,
            text: `I found this expert, ${expertName}, on DriveGuru. Here's their profile:`,
            url: profileUrl
        };
        try {
            await navigator.share(shareData);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Share failed:", err);
                toast({
                    variant: 'destructive',
                    title: "Share Failed",
                    description: "Could not share the profile at this time.",
                });
            }
        }
    };
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(profileUrl);
        toast({
            title: "Link Copied",
            description: "The link to this expert's profile has been copied to your clipboard.",
        });
    }

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Profile</DialogTitle>
                    <DialogDescription>
                        Share {expertName}'s profile with others.
                    </DialogDescription>
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
