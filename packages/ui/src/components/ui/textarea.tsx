import * as React from 'react';
import { cn } from 'cn';
import { fieldClasses } from './input';

// DevMentor multi-line field (shadcn, adapted in stage 2): same border, focus and states as Input;
// grows with its content (field-sizing), at least four lines (min-h-24 = 96 px), vertical resize only.
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClasses, 'field-sizing-content min-h-24 resize-y py-2', className)}
      {...props}
    />
  );
}

export { Textarea };
