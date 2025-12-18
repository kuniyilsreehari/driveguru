
'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { installPromptAtom } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { Download, CheckCircle, Hourglass } from 'lucide-react';
import { DialogProps } from '@radix-ui/react-dialog';

export function InstallPwaDialog({ ...props }: DialogProps) {
  const [installPrompt, setInstallPrompt] = useAtom(installPromptAtom);
  const [installState, setInstallState] = useState<'idle' | 'prompting' | 'installing' | 'installed'>('idle');
  const [progress, setProgress] = useState(0);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    setInstallState('prompting');
    try {
      const promptEvent = installPrompt as any;
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      if (outcome === 'accepted') {
        setInstallState('installing');
        setInstallPrompt(null);
      } else {
        setInstallState('idle'); // User dismissed the prompt
      }
    } catch (error) {
      console.error('PWA installation failed', error);
      setInstallState('idle');
    }
  };

  useEffect(() => {
    if (installState === 'installing') {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setInstallState('installed');
            return 100;
          }
          return prev + 20;
        });
      }, 300);

      return () => clearInterval(timer);
    }
  }, [installState]);
  
  if (!installPrompt && installState === 'idle') {
    return null;
  }

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-[425px]">
        {installState === 'idle' || installState === 'prompting' ? (
          <>
            <DialogHeader className="text-center items-center">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Install DriveGuru App</DialogTitle>
              <DialogDescription>
                For a better experience, install the DriveGuru app on your device. It&apos;s fast, works offline, and takes up minimal space.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center pt-4">
              <Button onClick={handleInstallClick} size="lg">
                Install Now
              </Button>
            </DialogFooter>
          </>
        ) : installState === 'installing' ? (
          <div className="text-center p-4">
             <div className="p-3 bg-primary/10 rounded-full w-fit mb-4 mx-auto">
                <Hourglass className="h-8 w-8 text-primary animate-spin" />
              </div>
            <h3 className="text-xl font-semibold mb-2">Installing...</h3>
            <p className="text-muted-foreground mb-4">Please wait while the app is being added to your device.</p>
            <Progress value={progress} className="w-full" />
          </div>
        ) : (
          <div className="text-center p-4">
            <div className="p-3 bg-green-500/10 rounded-full w-fit mb-4 mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Installation Complete!</h3>
            <p className="text-muted-foreground mb-4">The DriveGuru app has been successfully installed on your device.</p>
            <Button onClick={() => (props.onOpenChange as (open: boolean) => void)(false)}>
              Got it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

