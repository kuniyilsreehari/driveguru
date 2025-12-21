
"use client";

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
import { useFirestore } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, User, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
};

const formSchema = z.object({
  expertId: z.string({ required_error: "Please select an expert." }),
  reviewerName: z.string().min(2, { message: "Reviewer name is required." }),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(10, { message: "Comment must be at least 10 characters." }),
  status: z.enum(["approved", "pending", "rejected"]),
});

interface AddReviewFormProps {
    experts: ExpertUser[];
    onSuccess: () => void;
}

export function AddReviewForm({ experts, onSuccess }: AddReviewFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [rating, setRating] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reviewerName: "Admin",
      rating: 0,
      comment: "",
      status: "approved",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    const selectedExpert = experts.find(e => e.id === values.expertId);
    if (!selectedExpert) {
        toast({ variant: "destructive", title: "Error", description: "Invalid expert selected." });
        return;
    }
    
    const expertName = selectedExpert.companyName || `${selectedExpert.firstName} ${selectedExpert.lastName}`;

    const reviewsCollectionRef = collection(firestore, 'reviews');
    
    const newReviewData = {
      ...values,
      expertName,
      createdAt: serverTimestamp(),
    };

    // Use non-blocking update and let the centralized error handler catch permission issues.
    addDocumentNonBlocking(reviewsCollectionRef, newReviewData).then(() => {
        toast({
            title: "Review Added",
            description: "The new review has been successfully posted.",
        });
        onSuccess();
    }).catch(error => {
        // This catch is for client-side validation or other non-permission errors.
        // Permission errors are handled globally.
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
          name="expertId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expert to Review</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an expert or company" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {experts.map(expert => (
                    <SelectItem key={expert.id} value={expert.id}>
                        {expert.companyName || `${expert.firstName} ${expert.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reviewerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reviewer Name</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. Jane Doe" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Rating</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-6 w-6 cursor-pointer transition-colors",
                                    star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                )}
                                onClick={() => {
                                    setRating(star);
                                    field.onChange(star);
                                }}
                            />
                        ))}
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment</FormLabel>
               <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Textarea placeholder="Write the review here..." {...field} className="pl-10 min-h-[100px]" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
         <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Set the initial status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
          )}
        />


        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Review
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
