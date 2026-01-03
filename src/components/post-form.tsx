
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import type { ExpertUser } from '@/components/expert-card';

const formSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty.').max(500, 'Post cannot exceed 500 characters.'),
});

interface PostFormProps {
  userProfile: ExpertUser;
}

export function PostForm({ userProfile }: PostFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !userProfile) return;

    setIsSubmitting(true);

    try {
      const newPostRef = doc(collection(firestore, 'posts'));
      
      const newPost = {
        content: values.content,
        authorId: userProfile.id,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorPhotoUrl: userProfile.photoUrl || '',
        imageUrl: undefined, // No image support
        createdAt: serverTimestamp(),
        likes: [],
      };
      
      await addDocumentNonBlocking(newPostRef, newPost);
      
      toast({
        title: 'Post Published!',
        description: 'Your update is now live on the public feed.',
      });
      form.reset();
    } catch (error) {
       if ((error as any).name !== 'FirebaseError') {
        toast({
          variant: 'destructive',
          title: 'Failed to Post',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Post Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind? Share an update, a project you've completed, or a new skill you've learned..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end items-center gap-4">
            <p className="text-xs text-muted-foreground">{form.watch('content').length} / 500</p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
