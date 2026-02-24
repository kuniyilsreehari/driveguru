
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  children: React.ReactNode;
  className?: string;
  altText?: string;
}

export function ImageLightbox({ images, initialIndex = 0, children, className, altText }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isOpen, setIsOpen] = useState(false);

  // Sync state when dialog opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  if (!images || images.length === 0) return <>{children}</>;

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={cn("cursor-pointer outline-none", className)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="p-0 border-0 max-w-4xl bg-transparent shadow-none flex items-center justify-center overflow-hidden sm:rounded-3xl focus:ring-0">
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <DialogDescription className="sr-only">Viewing image {currentIndex + 1} of {images.length}</DialogDescription>
        
        <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center group outline-none">
            <div className="relative w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                <Image
                    src={images[currentIndex]}
                    alt={altText || `Gallery image ${currentIndex + 1}`}
                    width={1200}
                    height={1200}
                    className="object-contain w-auto h-auto max-w-full max-h-[90vh] rounded-xl shadow-2xl select-none"
                    priority
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                />
            </div>

            {images.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white border-none transition-all opacity-0 group-hover:opacity-100 hidden sm:flex z-10"
                        onClick={handlePrevious}
                    >
                        <ChevronLeft className="h-10 w-10" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white border-none transition-all opacity-0 group-hover:opacity-100 hidden sm:flex z-10"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-10 w-10" />
                    </Button>
                    
                    {/* Mobile Tap Areas */}
                    <div className="absolute inset-0 flex sm:hidden z-0">
                        <div className="flex-1 h-full" onClick={handlePrevious} />
                        <div className="flex-1 h-full" onClick={handleNext} />
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full z-20 backdrop-blur-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
