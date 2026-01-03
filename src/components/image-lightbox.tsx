
'use client';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface ImageLightboxProps {
  imageUrl: string;
  altText: string;
  children: React.ReactNode;
}

export function ImageLightbox({ imageUrl, altText, children }: ImageLightboxProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 border-0 max-w-4xl bg-transparent shadow-none">
        <div className="relative aspect-video w-full h-auto">
            <Image
                src={imageUrl}
                alt={altText}
                fill
                className="object-contain"
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
