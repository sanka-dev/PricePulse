import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ModeToggle } from '@/components/mode-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-6 flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center group">
          <BrandLogo className="text-3xl text-foreground" />
        </Link>
        <ModeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
