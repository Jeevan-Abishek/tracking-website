import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-gradient-to-br from-surface2 to-surface border border-line rounded-xl2 p-6',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export { Card };
