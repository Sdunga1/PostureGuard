import { createAuthenticatedClient } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

/**
 * GET /api/vault — Retrieve the user's Claude API key
 */
export async function GET(request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ key: null });
  }

  return NextResponse.json({ key: data.encrypted_key });
}

/**
 * POST /api/vault — Store/update the user's Claude API key
 * Body: { key: "sk-ant-..." }
 */
export async function POST(request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await request.json();

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .upsert(
      {
        user_id: user.id,
        encrypted_key: key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
