'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Avatar as AvatarPrimitive } from 'radix-ui';

// DevMentor avatar — PHOTO ONLY (stage 0 decision 2, A01: no initials, no coloured letter squares).
// Without a photo, or when it fails to load, nothing is rendered and the name next to it stands alone
// (PROPOSAL, default accepted 2026-10-24). Sizes 24 / 32 / 40 px (40 = one list row, K1), circle (PROPOSAL).
// shadcn's AvatarFallback, AvatarBadge (online dot = A05) and AvatarGroup were removed: not in the plan.
const sizeClass = { sm: 'size-6', default: 'size-8', lg: 'size-control' } as const;

type AvatarProps = Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, 'children'> & {
  /** Photo URL. Empty → the avatar renders nothing. */
  src?: string | null;
  /** Alternative text. Use "" when the person's name is printed next to the photo (decorative). */
  alt: string;
  /** sm 24 px, default 32 px, lg 40 px. */
  size?: keyof typeof sizeClass;
};

function Avatar({ src, alt, size = 'default', className, ...props }: AvatarProps) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  if (!src) return null;
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-status={status}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full select-none',
        sizeClass[size],
        status === 'loaded' ? 'flex' : 'hidden',
        className,
      )}
      {...props}
    >
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        src={src}
        alt={alt}
        onLoadingStatusChange={setStatus}
        className="aspect-square size-full object-cover"
      />
    </AvatarPrimitive.Root>
  );
}

export { Avatar, type AvatarProps };
