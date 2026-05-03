import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { HomeLenis } from '@/components/home-lenis';
import { Button } from '@/components/ui';
import GlassSurface from '@/components/ui/GlassSurface';
import { GlowingCard } from '@/components/ui/glowing-card';
import { HomeHeroSearchExperience } from '@/components/home-hero-search-experience';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HomeLenis />
      {/* Header - Floating Glass Effect */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <GlassSurface
          width="100%"
          height={56}
          borderRadius={32}
          borderWidth={0.08}
          brightness={55}
          opacity={0.9}
          blur={10}
          displace={8}
          backgroundOpacity={0.1}
          saturation={1.5}
          distortionScale={-160}
          redOffset={3}
          greenOffset={12}
          blueOffset={20}
          mixBlendMode="screen"
          className="relative"
        >
          <div className="w-full px-6 h-14 flex items-center justify-between relative z-10">
            <Link href="/" className="flex items-center group">
              <BrandLogo className="text-2xl" />
            </Link>
            <nav className="ml-auto flex items-center justify-end gap-5">
              <Link
                href="#features"
                className="text-sm whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="/login"
                className="text-sm whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Button asChild size="sm" className="rounded-xl whitespace-nowrap">
                <Link href="/register">Get Started</Link>
              </Button>
            </nav>
          </div>
        </GlassSurface>
      </header>

      <HomeHeroSearchExperience />

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Simple tools to help you find the best deals on your next vehicle.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <GlowingCard
              value="24/7"
              title="Price History"
              description="See complete price history with interactive charts. Understand market trends at a glance."
            />
            <GlowingCard
              value="Real time"
              title="Instant Alerts"
              description="Get notified immediately when prices drop below your target. Never miss a deal again."
            />
            <GlowingCard
              value="Multi site"
              title="Multi Platform"
              description="Track vehicles from multiple listing sites in one unified dashboard."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <BrandLogo className="text-2xl" />
          </div>
          <p className="text-sm text-muted-foreground">© 2026 PricePulse. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
