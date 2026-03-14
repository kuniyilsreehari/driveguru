'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { installPromptAtom } from '@/lib/store';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, Smartphone, Monitor, Loader2 } from 'lucide-react';

interface InstallPwaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallPwaDialog({ open, onOpenChange }: InstallPwaDialogProps) {
  const [installPrompt, setInstallPrompt] = useAtom(installPromptAtom);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'success'>('idle');
  const [progress, setProgress] = useState(0);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    try {
      const promptEvent = installPrompt as any;
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      if (outcome === 'accepted') {
        setInstallState('installing');
        simulateProgress();
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('PWA installation failed', error);
      setInstallState('idle');
    }
  };

  const simulateProgress = () => {
    let current = 0;
    const totalTime = 18000; // 18 seconds as requested
    const intervalTime = 100; // Update every 100ms
    const step = 100 / (totalTime / intervalTime);

    const interval = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setInstallState('success'), 800);
      }
      setProgress(current);
    }, intervalTime);
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setInstallState('idle');
        setProgress(0);
      }, 300);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-[#1a1c23] border-none rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
        {installState === 'idle' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <DialogHeader className="text-center items-center">
              <div className="p-5 bg-orange-500/10 rounded-full w-fit mb-6 border border-orange-500/20 shadow-inner">
                <Download className="h-10 w-10 text-orange-500" />
              </div>
              <DialogTitle className="text-3xl font-black text-white uppercase italic tracking-tighter">
                Install DriveGuru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium pt-2 text-center leading-relaxed">
                Add DriveGuru to your device for a fast, app-like experience. Works offline and provides instant professional access.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-8">
                <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5">
                    <Smartphone className="h-6 w-6 text-orange-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile App</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5">
                    <Monitor className="h-6 w-6 text-orange-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Desktop Ready</span>
                </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button 
                onClick={handleInstallClick} 
                className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-lg shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95"
              >
                INSTALL APPLICATION
              </Button>
            </DialogFooter>
          </div>
        )}

        {installState === 'installing' && (
          <div className="py-12 flex flex-col items-center text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
                <Loader2 className="h-24 w-24 text-green-500 animate-spin opacity-20" />
                <Download className="h-10 w-10 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">Syncing Files...</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Configuring offline professional database.</p>
            <div className="w-full space-y-3">
                <Progress 
                  value={progress} 
                  className="h-3 bg-white/5 rounded-full overflow-hidden" 
                  indicatorClassName="bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                />
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">{Math.round(progress)}% COMPLETE</p>
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">DO NOT CLOSE</p>
                </div>
            </div>
          </div>
        )}

        {installState === 'success' && (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in fade-in duration-500">
            <div className="p-6 bg-green-500/10 rounded-full w-fit mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle className="h-14 w-14 text-green-500" />
            </div>
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Setup Finished</h3>
            <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
              DriveGuru is now installed. Launch it from your home screen for lightning-fast professional connections.
            </p>
            <Button 
              onClick={() => onOpenChange(false)} 
              className="w-full h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-green-500/20 transition-all active:scale-95"
            >
              CONTINUE TO APP
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
