import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl font-display font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-amber text-[#1A1305]',
        teal: 'bg-teal text-[#062622]',
        ghost: 'bg-transparent border border-line text-muted',
        danger: 'bg-transparent border border-danger text-danger'
      },
      size: {
        default: 'px-5 py-4 text-base',
        sm: 'px-4 py-2 text-sm'
      }
    },
    defaultVariants: { variant: 'primary', size: 'default' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
