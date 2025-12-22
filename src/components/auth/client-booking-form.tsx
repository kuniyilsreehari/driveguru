
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { collection, serverTimestamp } from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { User, Phone, MapPin, Briefcase, Send } from "lucide-react";
import { useRouter } from "next/navigation";


const formSchema = z.object({
  clientName: z.string().min(2, { message: "Client name is required." }),
  clientContact: z.string().min(10, { message: "A valid contact number is required." }),
  place: z.string().min(2, { message: "Place is required." }),
  workDescription: z.string().min(10, { message: "Work description must be at least 10 characters." }),
  bookingDate: z.date({
    required_error: "A date for the booking is required.",
  }),
});

interface ClientBookingFormProps {
    expertId: string;
}

export function ClientBookingForm({ expertId }: ClientBookingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      clientContact: "",
      place: "",
      workDescription: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    if (!user && !isUserLoading) {
        toast({
            variant: "destructive",
            title: "Authentication Required",
            description: "You must be logged in to book an appointment.",
        });
        router.push('/login');
        return;
    }

    const bookingsCollectionRef = collection(firestore, 'bookings');
    
    const newBookingData = {
      ...values,
      expertId: expertId,
      clientId: user?.uid,
      status: "confirmed",
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(bookingsCollectionRef, newBookingData).then(() => {
        toast({
            title: "Booking Submitted!",
            description: "Your appointment request has been sent to the expert.",
        });
        form.reset();
        router.push(`/expert/${expertId}`);
    }).catch(error => {
        if (error.name !== 'FirebaseError') {
             toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "An unexpected error occurred. Please try again.",
            });
        }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. John Smith" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Contact Number</FormLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input type="tel" placeholder="e.g. 9876543210" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="place"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place of Work</FormLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. My Office, City Center" {...field} className="pl-10" />
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
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Textarea placeholder="Briefly describe the job..." {...field} className="pl-10 min-h-[100px]" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bookingDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested Date</FormLabel>
                <FormControl>
                    <Input 
                      type="date"
                      onChange={(e) => field.onChange(e.target.valueAsDate)}
                      className="w-full"
                    />
                </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isUserLoading}>
          {form.formState.isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Booking Request
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
