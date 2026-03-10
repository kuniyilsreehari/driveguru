
'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Mail, ExternalLink, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Vacancy } from '@/app/vacancies/page';
import { Icons } from './icons';

interface ApplyNowDialogProps {
  vacancy: Vacancy;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyNowDialog({ vacancy, isOpen, onOpenChange }: ApplyNowDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userDocRef);

  const subject = `Application for ${vacancy.title}`;

  const handleCopy = async (text: string, type: 'email' | 'subject') => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    }
    toast({ title: "Copied to clipboard" });
  };

  const getMailBody = () => {
    let body = `Hello ${vacancy.companyName} Team,\n\nI am writing to express my interest in the ${vacancy.title} position posted on DriveGuru.\n\n`;
    
    if (profile) {
        const fullName = `${profile.firstName} ${profile.lastName}`;
        const location = [profile.city, profile.state].filter(Boolean).join(', ') || 'Not specified';
        const email = profile.email || user?.email || 'Not specified';
        const dgId = `DG-${profile.id?.substring(0, 8).toUpperCase()}`;
        
        body += `*CANDIDATE DETAILS*\n`;
        body += `NAME: ${fullName}\n`;
        body += `PLACE: ${location}\n`;
        body += `CONTACT EMAIL: ${email}\n`;
        body += `DRIVEGURU ID: ${dgId}\n`;
        body += `TIER: ${profile.tier || 'Standard'}\n\n`;
        body += `I have attached my professional details and look forward to your response.\n\nBest regards,\n${fullName}`;
    } else {
        body += `I would like to apply for this position. Please find my professional details below:\n\n`;
        body += `NAME: \n`;
        body += `PLACE: \n`;
        body += `CONTACT EMAIL: \n`;
        body += `\nThank you.`;
    }
    return body;
  };

  const handleGmailApply = () => {
    const body = getMailBody();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${vacancy.companyEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = gmailUrl;
  };

  const handleDefaultMailApply = () => {
    const body = getMailBody();
    const mailtoUrl = `mailto:${vacancy.companyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-[#1a1c23] border-none rounded-[2.5rem] shadow-2xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tight">Direct Application</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium pt-2 leading-relaxed">
            Send your professional profile directly to the recruiter. Use Gmail or your default email app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Company Email</Label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Input 
                  value={vacancy.companyEmail} 
                  readOnly 
                  className="h-12 bg-white/5 border-2 border-orange-500/30 focus-visible:ring-orange-500 rounded-xl font-bold text-white pr-4 shadow-inner"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => handleCopy(vacancy.companyEmail, 'email')}
              >
                {copiedEmail ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Subject</Label>
            <div className="flex gap-2">
              <Input 
                value={subject} 
                readOnly 
                className="h-12 bg-white/5 border-none rounded-xl font-bold text-white/70"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => handleCopy(subject, 'subject')}
              >
                {copiedSubject ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
            <Button 
                className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95"
                onClick={handleGmailApply}
            >
                <Icons.google className="mr-2 h-5 w-5" /> APPLY VIA GMAIL
            </Button>
            
            <Button 
                variant="outline"
                className="w-full h-12 rounded-xl border-white/10 bg-white/5 text-white font-bold hover:bg-white/10"
                onClick={handleDefaultMailApply}
            >
                <Mail className="mr-2 h-4 w-4" /> DEFAULT MAIL APP
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
