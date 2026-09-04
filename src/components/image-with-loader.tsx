
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageOff, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ImageWithLoaderProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageWithLoader({ src, alt, className }: ImageWithLoaderProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  // Bump this to force <Image> to re-request the same src on retry.
  const [retryToken, setRetryToken] = useState(0);

  // Reset when the underlying image URL itself changes (e.g. a new computation ran).
  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div className={cn("relative w-full h-full bg-muted/30", className)}>
      {status === 'loading' && (
        <div className="absolute inset-0">
          <Skeleton className="absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Rendering imagery&hellip;</span>
          </div>
        </div>
      )}

      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageOff className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Image failed to load</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setStatus('loading'); setRetryToken((t) => t + 1); }}
          >
            <Loader2 className="mr-1.5 h-3 w-3" /> Retry
          </Button>
        </div>
      ) : (
        <Image
          key={retryToken}
          src={src}
          alt={alt}
          fill
          // These are a handful of just-computed result images the user is actively waiting on,
          // not a long scrollable gallery - next/image's default loading="lazy" (viewport-gated)
          // was leaving them stuck indefinitely whenever they render below the fold. `priority`
          // forces eager loading so they fetch immediately regardless of scroll position.
          priority
          className={cn(
              "object-cover transition-opacity duration-500",
              status === 'loaded' ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          unoptimized // Necessary for external data URLs from Earth Engine
        />
      )}
    </div>
  );
}
