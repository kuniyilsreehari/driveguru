
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, MessageSquare, Send, User, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { ExpertUser } from './expert-card';
import { useUser } from '@/firebase';

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'Name is required.' }),
  clientEmail: z.string().email({ message: 'A valid email is required.' }),
  date: z.date({ required_error: 'A date is required.' }),
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
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: currentUser?.displayName || '',
      clientEmail: currentUser?.email || '',
      time: format(new Date(), 'HH:mm'),
      location: '',
      workRequired: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const expertName = getDisplayName(expert);
    const formattedDate = format(values.date, 'MMMM do, yyyy');

    const message = `*New Booking Request – DriveGuru*

Hello ${expertName},

A new appointment has been requested. Please review the details below and respond to the client.

*Client Details*
Name: ${values.clientName}
Email: ${values.clientEmail}

*Appointment Details*
Date: ${formattedDate}
Time: ${values.time}
Location: ${values.location}
Work Required: ${values.workRequired}`;
    
    const formattedPhoneNumber = cleanPhoneNumber(expert.phoneNumber);
    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Appointment via WhatsApp</DialogTitle>
          <DialogDescription>Fill in the details below. This will generate a pre-filled WhatsApp message to send to {getDisplayName(expert)}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                  <FormLabel>Your Email</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="email" placeholder="e.g. john@example.com" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

             <h4 className="text-sm font-medium text-muted-foreground pt-2">Appointment Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
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
            </div>
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
             <DialogFooter>
                <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Generate WhatsApp Message
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
