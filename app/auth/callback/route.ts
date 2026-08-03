import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const name = searchParams.get('name') ?? 'Rider';

  if (code) {
    try {
      const supabase = createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // Ignore auth errors if Supabase is not configured
    }
  }

  return NextResponse.redirect(`${origin}/rider/live?name=${encodeURIComponent(name)}`);
}
