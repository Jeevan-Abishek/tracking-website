import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-surface border border-line text-white rounded-2xl px-4 py-4 text-base font-body',
        'focus:outline-none focus:border-amber placeholder:text-muted',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
