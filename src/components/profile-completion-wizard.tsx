
'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const stepSchema = z.object({
  value: z.string().min(1, "This field is required"),
});

interface ProfileCompletionWizardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: any;
}

type Step = {
  id: string;
  field: string;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
};

export function ProfileCompletionWizard({ isOpen, onOpenChange, userProfile }: ProfileCompletionWizardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = useMemo(() => {
    const allPossibleSteps: Step[] = [
      {
        id: 'profession',
        field: 'profession',
        title: 'What is your profession?',
        description: 'Specify your primary job title (e.g., Senior Plumber).',
        label: 'Profession',
        placeholder: 'Enter your profession',
        type: 'input'
      },
      {
        id: 'qualification',
        field: 'qualification',
        title: 'What is your highest qualification?',
        description: 'Tell us about your educational background.',
        label: 'Qualification',
        placeholder: 'Enter your qualification',
        type: 'input'
      },
      {
        id: 'skills',
        field: 'skills',
        title: 'What are your core skills?',
        description: 'List your professional skills (comma-separated).',
        label: 'Skills',
        placeholder: 'e.g. Tiling, Leak Repair, Pipe Fitting',
        type: 'input'
      },
      {
        id: 'aboutMe',
        field: 'aboutMe',
        title: 'Tell us about yourself',
        description: 'A brief summary of your professional background.',
        label: 'About Me',
        placeholder: 'Write a short bio...',
        type: 'textarea'
      },
      {
        id: 'city',
        field: 'city',
        title: 'Where are you located?',
        description: 'Enter your primary district or city.',
        label: 'City',
        placeholder: 'e.g. Kozhikode',
        type: 'input'
      },
      {
        id: 'phoneNumber',
        field: 'phoneNumber',
        title: 'Your contact number',
        description: 'Enter your mobile number for clients to reach you.',
        label: 'Phone Number',
        placeholder: 'e.g. +91 9876543210',
        type: 'input'
      }
    ];

    // Only show steps for fields that are missing
    return allPossibleSteps.filter(step => !userProfile[step.field]);
  }, [userProfile]);

  const currentStep = steps[currentStepIndex];

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<z.infer<typeof stepSchema>>({
    resolver: zodResolver(stepSchema),
  });

  // Effect to reset form value when step changes
  React.useEffect(() => {
    if (currentStep) {
      setValue('value', '');
    }
  }, [currentStepIndex, currentStep, setValue]);

  const onNext = async (data: z.infer<typeof stepSchema>) => {
    if (!firestore || !userProfile.id || !currentStep) return;

    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', userProfile.id);
      await updateDocumentNonBlocking(userRef, {
        [currentStep.field]: data.value
      });

      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        reset();
      } else {
        toast({ title: "Profile Completed!", description: "Your details have been saved successfully." });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Update failed", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save data." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentStep) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <UiDialogDescription>{currentStep.title}</UiDialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onNext)} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor={currentStep.id}>{currentStep.label}</Label>
            {currentStep.type === 'textarea' ? (
              <Textarea 
                id={currentStep.id}
                placeholder={currentStep.placeholder}
                className="min-h-[100px]"
                {...register('value')}
              />
            ) : (
              <Input 
                id={currentStep.id}
                placeholder={currentStep.placeholder}
                {...register('value')}
              />
            )}
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>

          <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStepIndex(prev => prev - 1)}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {currentStepIndex === steps.length - 1 ? 'Save & Finish' : 'Next'} 
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for DialogDescription since it was missing in standard exports
const UiDialogDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <p className={className ? className : "text-sm text-muted-foreground"}>{children}</p>
);
