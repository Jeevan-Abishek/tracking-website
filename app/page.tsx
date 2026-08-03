import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col px-5 pt-8 pb-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-amber animate-pulse" />
        <span className="font-display text-sm tracking-widest uppercase text-muted">Trailmark</span>
      </div>
      <h1 className="font-display font-bold text-[34px] leading-[1.15] mt-4 mb-2">
        Share your route.
        <br />
        <span className="text-amber">Live</span>, on a map.
      </h1>
      <p className="text-muted text-[15px] leading-relaxed mb-8 max-w-[34ch]">
        Start sharing your bike&apos;s location, or track someone who sent you a code.
      </p>

      <div className="flex flex-col gap-3.5 mt-auto">
        <Link href="/rider">
          <Card className="cursor-pointer active:scale-[0.98] transition-transform relative">
            <div className="font-mono text-xs tracking-widest uppercase text-amber">Rider</div>
            <h2 className="font-display text-xl mt-2 mb-1.5">Start sharing</h2>
            <p className="text-muted text-[13.5px] leading-relaxed">
              Sign in, turn on live location, and get a code to send the person tracking you.
            </p>
          </Card>
        </Link>
        <Link href="/track">
          <Card className="cursor-pointer active:scale-[0.98] transition-transform relative">
            <div className="font-mono text-xs tracking-widest uppercase text-teal">Tracker</div>
            <h2 className="font-display text-xl mt-2 mb-1.5">Track someone</h2>
            <p className="text-muted text-[13.5px] leading-relaxed">
              Enter the 6-character code they sent you to see their live route.
            </p>
          </Card>
        </Link>
      </div>
    </main>
  );
}
