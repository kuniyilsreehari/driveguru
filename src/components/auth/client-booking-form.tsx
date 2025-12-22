
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { User } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Mail, MapPin, FileText, Send } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type ExpertProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phoneNumber?: string;
};

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'Your name is required.' }),
  clientEmail: z.string().email({ message: 'A valid email is required.' }),
  requestedDate: z.date({ required_error: 'Please select a date.' }),
  requestedTime: z.string().min(1, { message: 'Please enter a time.' }),
  workDescription: z.string().min(10, { message: 'Please describe the work needed.' }),
  location: z.string().min(5, { message: 'Please provide your location or address.' }),
});

interface ClientBookingFormProps {
  client: User;
  expert: ExpertProfile;
}

export function ClientBookingForm({ client, expert }: ClientBookingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: client.displayName || '',
      clientEmail: client.email || '',
      requestedTime: '',
      workDescription: '',
      location: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    const expertName = expert.companyName || `${expert.firstName} ${expert.lastName}`;

    const bookingData = {
      clientId: client.uid,
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      expertId: expert.id,
      expertName: expertName,
      requestedDateTime: new Date(`${format(values.requestedDate, 'yyyy-MM-dd')}T${values.requestedTime}`),
      workDescription: values.workDescription,
      location: values.location,
      status: 'confirmed',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'bookings'), bookingData);
      const newBookingId = docRef.id;

      toast({
        title: 'Booking Request Sent!',
        description: 'Your appointment has been logged. You will be redirected to WhatsApp to notify the expert.',
      });

      // WhatsApp Integration
      const expertPhoneNumber = expert.phoneNumber?.replace(/[^0-9]/g, '');
      if (expertPhoneNumber) {
        const message = `
Hello ${expertName},

I have booked an appointment through DriveGuru.

*Booking Details:*
*Client Name:* ${values.clientName}
*Date:* ${format(values.requestedDate, 'PPP')}
*Time:* ${values.requestedTime}
*Location:* ${values.location}
*Work:* ${values.workDescription}
*Booking ID:* ${newBookingId}

Please confirm this appointment.

Thank you,
${values.clientName}
        `.trim();
        
        const whatsappUrl = `https://wa.me/${expertPhoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }

      form.reset();
      router.push(`/expert/${expert.id}`);

    } catch (error) {
      console.error('Booking failed:', error);
      if ((error as any).name !== 'FirebaseError') {
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: 'Could not save your appointment. Please try again.',
        });
      }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} className="pl-10" />
                  </FormControl>
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
                  <FormControl>
                    <Input type="email" placeholder="e.g. john@example.com" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="requestedDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Requested Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="requestedTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requested Time</FormLabel>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input type="time" {...field} className="pl-10" />
                  </FormControl>
                </div>
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
              <FormLabel>Your Location / Address</FormLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. 123 Main St, Anytown" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Description</FormLabel>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Textarea placeholder="Briefly describe the work you need done..." {...field} className="pl-10 min-h-[100px]" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
        </Button>
      </form>
    </Form>
  );
}
