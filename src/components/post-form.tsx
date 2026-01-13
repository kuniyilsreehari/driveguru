

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
import { Loader2, Send, Type, Link as LinkIcon } from 'lucide-react';
import { Input } from './ui/input';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100, 'Title cannot exceed 100 characters.'),
  content: z.string().min(2, 'Post must be at least 2 characters.').max(1000, 'Post cannot exceed 1000 characters.'),
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Title</FormLabel>
               <div className="relative">
                <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="A catchy title for your post" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind? Share an update..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end items-center gap-4">
            <p className="text-xs text-muted-foreground">{form.watch('content').length} / 1000</p>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
