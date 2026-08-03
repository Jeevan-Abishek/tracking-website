'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RiderAuthPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/rider/live');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMagicLink() {
    setError('');
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?name=${encodeURIComponent(name || 'Rider')}`
      }
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen flex flex-col p-5">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
        <Link href="/" className="text-muted text-sm">← Back</Link>
      </div>

      {sent ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="font-display text-xl mb-2">Check your email</h2>
          <p className="text-muted text-sm max-w-[30ch]">
            We sent a secure sign-in link to {email}. Open it on this device to start sharing.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <h1 className="font-display text-2xl font-semibold mb-1">Sign in to share</h1>
          <p className="text-muted text-sm mb-6">We use a magic link — no password needed.</p>

          <label className="text-xs text-muted mb-2 tracking-wide">Your name (shown to trackers)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arun" className="mb-5" />

          <label className="text-xs text-muted mb-2 tracking-wide">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-danger text-sm mt-2 min-h-[16px]">{error}</p>

          <Button onClick={sendMagicLink} disabled={loading} className="mt-auto w-full">
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </div>
      )}
    </main>
  );
}
