
'use client';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  imageUrl: string;
  altText: string;
  children: React.ReactNode;
  className?: string;
}

export function ImageLightbox({ imageUrl, altText, children, className }: ImageLightboxProps) {
  if (!imageUrl) return <>{children}</>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn("cursor-pointer outline-none", className)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="p-0 border-0 max-w-3xl bg-transparent shadow-none flex items-center justify-center overflow-hidden sm:rounded-3xl">
        <DialogTitle className="sr-only">Enlarged Profile Image</DialogTitle>
        <DialogDescription className="sr-only">Full size view of {altText}</DialogDescription>
        <div className="relative w-full h-full max-h-[85vh] aspect-square sm:aspect-auto flex items-center justify-center">
            <Image
                src={imageUrl}
                alt={altText}
                width={800}
                height={800}
                className="object-contain w-auto h-auto max-w-full max-h-[85vh] rounded-xl shadow-2xl select-none"
                priority
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
