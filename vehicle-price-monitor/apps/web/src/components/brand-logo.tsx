import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-baseline tracking-tight leading-none', className)}>
      <span className="font-semibold">Price</span>
      <span className="font-brand-pulse ml-[1px]">Pulse</span>
    </span>
  );
}
