
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useAuth, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
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
import { Loader2, Send, Image as ImageIcon, XCircle } from 'lucide-react';
import type { ExpertUser } from '@/components/expert-card';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty.').max(500, 'Post cannot exceed 500 characters.'),
});

interface PostFormProps {
  userProfile: ExpertUser;
}

export function PostForm({ userProfile }: PostFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  async function uploadImage(file: File, userId: string, postId: string): Promise<string> {
    if (!auth) throw new Error("Auth service is not available.");
    const storage = getStorage(auth.app);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const imagePath = `post-images/${userId}/${postId}/image.${fileExtension}`;
    const imageRef = storageRef(storage, imagePath);

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                await uploadString(imageRef, dataUrl, 'data_url');
                const downloadUrl = await getDownloadURL(imageRef);
                resolve(downloadUrl);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !userProfile) return;

    setIsSubmitting(true);
    let imageUrl: string | undefined = undefined;

    try {
      const newPostRef = doc(collection(firestore, 'posts')); // Generate ID upfront
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, userProfile.id, newPostRef.id);
      }

      const newPost = {
        content: values.content,
        authorId: userProfile.id,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorPhotoUrl: userProfile.photoUrl || '',
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: [],
      };
      
      await addDocumentNonBlocking(newPostRef, newPost);
      
      toast({
        title: 'Post Published!',
        description: 'Your update is now live on the public feed.',
      });
      form.reset();
      removeImage();
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
        
        {imagePreview && (
            <div className="relative w-full rounded-lg overflow-hidden border">
                <Image src={imagePreview} alt="Image preview" width={0} height={0} sizes="100vw" style={{ width: '100%', height: 'auto' }} />
                <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 rounded-full"
                    onClick={removeImage}
                >
                    <XCircle className="h-4 w-4" />
                </Button>
            </div>
        )}

        <div className="flex justify-between items-center gap-4">
             <div>
                 <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleImageChange}
                />
            </div>
            <div className="flex items-center gap-4">
                <p className="text-xs text-muted-foreground">{form.watch('content').length} / 500</p>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Button>
            </div>
        </div>
      </form>
    </Form>
  );
}
