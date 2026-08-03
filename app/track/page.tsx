'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TrackEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function go() {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      setError('Enter the full 6-character code.');
      return;
    }
    router.push(`/track/${clean}`);
  }

  return (
    <main className="min-h-screen flex flex-col p-5">
      <Link href="/" className="text-muted text-sm border-b border-line pb-4 mb-6">← Back</Link>
      <h1 className="font-display text-2xl font-semibold mb-1">Track someone</h1>
      <p className="text-muted text-sm mb-6">Enter the 6-character code they sent you.</p>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="text-center font-mono text-lg tracking-widest uppercase"
      />
      <p className="text-danger text-sm mt-2 min-h-[16px]">{error}</p>

      <Button variant="teal" onClick={go} className="mt-auto w-full">
        Track
      </Button>
    </main>
  );
}
