
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CalendarIcon, MapPin, MessageSquare, Send, User, Mail, Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ExpertUser } from './expert-card';
import { useUser } from '@/firebase';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'Name is required.' }),
  clientEmail: z.string().email({ message: 'Please enter a valid email.' }).optional().or(z.literal('')),
  clientPhone: z.string().min(10, { message: 'A valid phone number is required.' }),
  date: z.string().min(1, 'A date is required.'),
  time: z.string().min(1, 'A time is required.'),
  location: z.string().min(1, 'A location is required.'),
  workRequired: z.string().min(10, 'Please describe the work in at least 10 characters.'),
});

interface WhatsAppBookingDialogProps {
  expert: ExpertUser;
  children: React.ReactNode;
}

const getDisplayName = (expert?: ExpertUser) => {
    if (!expert) return '';
    return expert.companyName || `${expert.firstName} ${expert.lastName}`;
}

const cleanPhoneNumber = (phoneNumber?: string) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\s+/g, '');
}

export function WhatsAppBookingDialog({ expert, children }: WhatsAppBookingDialogProps) {
  const { user: currentUser } = useUser();
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: currentUser?.displayName || '',
      clientEmail: currentUser?.email || '',
      clientPhone: currentUser?.phoneNumber || '',
      date: new Date().toISOString().split('T')[0], // Default to today
      time: new Date().toTimeString().slice(0,5),
      location: '',
      workRequired: '',
    },
  });

  const handleNextStep = async () => {
    const fieldsToValidate: ('clientName' | 'clientEmail' | 'clientPhone')[] = ['clientName', 'clientEmail', 'clientPhone'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const expertName = getDisplayName(expert);

    const message = `*New Booking Request – DriveGuru*

Hello ${expertName},

A new appointment has been requested. Please review the details below and respond to the client.

*Client Details*
Name: ${values.clientName}
${values.clientEmail ? `Email: ${values.clientEmail}\n` : ''}Phone: ${values.clientPhone}

*Appointment Details*
Date: ${values.date}
Time: ${values.time}
Location: ${values.location}
Work Required: ${values.workRequired}

To proceed, please reply with "Confirm" or "Cancel".`;
    
    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);
    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  }

  return (
    <Dialog onOpenChange={() => setStep(1)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Book Appointment via WhatsApp</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "First, let's get your contact information."
              : `Fill in the details for your appointment with ${getDisplayName(expert)}.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col flex-grow min-h-0">
            <ScrollArea className="flex-grow border rounded-md p-4">
              <div className="space-y-4">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input placeholder="e.g. John Doe" {...field} className="pl-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Email (Optional)</FormLabel>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="email" placeholder="e.g. john@example.com" {...field} className="pl-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Contact Number</FormLabel>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="tel" placeholder="e.g. +91 9876543210" {...field} className="pl-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h4 className="text-sm font-medium text-muted-foreground">Appointment Details</h4>
                    
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Time</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input placeholder="e.g., Your City" {...field} className="pl-10" /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Required</FormLabel>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Textarea placeholder="Briefly describe the work you need done..." {...field} className="pl-10 min-h-[100px]" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </ScrollArea>
             <DialogFooter className="pt-4 flex-shrink-0">
                {step === 1 ? (
                  <Button type="button" className="w-full" onClick={handleNextStep}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <div className="w-full flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1">
                        <Send className="mr-2 h-4 w-4" />
                        Generate Message
                    </Button>
                  </div>
                )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
