
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

const formSchema = z.object({
  content: z.string().min(2, 'Post must be at least 2 characters.').max(500, 'Post cannot exceed 500 characters.'),
});

interface PostFormProps {
  form: ReturnType<typeof useForm<z.infer<typeof formSchema>>>;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  isSubmitting: boolean;
}

export function PostForm({ form, onSubmit, isSubmitting }: PostFormProps) {
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
                  placeholder="What's on your mind? Share an update..."
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
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

    