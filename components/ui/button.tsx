import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const variants=cva('button',{variants:{variant:{default:'button-primary',outline:'button-outline',ghost:'button-ghost',accent:'button-accent',destructive:'button-destructive'},size:{default:'',sm:'button-sm',icon:'button-icon',lg:'button-lg'}},defaultVariants:{variant:'default',size:'default'}});
export function Button({className,variant,size,asChild=false,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>&{asChild?:boolean}) { const C=asChild?Slot:'button';return <C className={cn(variants({variant,size}),className)} {...props}/>; }
