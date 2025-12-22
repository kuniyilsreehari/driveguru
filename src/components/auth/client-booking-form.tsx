
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { User } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Mail, MapPin, FileText, Send } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';

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
    setIsSubmitting(true);
    
    const expertName = expert.companyName || `${expert.firstName} ${expert.lastName}`;
    const expertPhoneNumber = expert.phoneNumber?.replace(/[^0-9]/g, '');

    if (!expertPhoneNumber) {
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: 'This expert has not provided a contact number.',
        });
        setIsSubmitting(false);
        return;
    }

    try {
        const message = `
*New Booking Request from DriveGuru*

Hello ${expertName},

A new appointment has been requested. Please review the details below and reply to the client.

*Client Details:*
- *Name:* ${values.clientName}
- *Email:* ${values.clientEmail}

*Appointment Details:*
- *Date:* ${format(values.requestedDate, 'PPP')}
- *Time:* ${values.requestedTime}
- *Location:* ${values.location}
- *Work Required:* ${values.workDescription}

-------------------
*To the Expert:* Please reply to confirm this appointment time or suggest a new one.
        `.trim().replace(/\n\s*\n/g, '\n\n'); // Clean up extra whitespace for better formatting

        const whatsappUrl = `https://wa.me/${expertPhoneNumber}?text=${encodeURIComponent(message)}`;
        
        toast({
            title: 'Redirecting to WhatsApp',
            description: 'Please send the pre-filled message to the expert.',
        });

        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
        
        // Redirect the user back to the expert's profile
        router.push(`/expert/${expert.id}`);

    } catch (error) {
      console.error('Failed to generate WhatsApp link:', error);
      toast({
          variant: 'destructive',
          title: 'Failed',
          description: 'Could not prepare the WhatsApp message. Please try again.',
      });
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
          {isSubmitting ? 'Processing...' : 'Send Request via WhatsApp'}
        </Button>
      </form>
    </Form>
  );
}
