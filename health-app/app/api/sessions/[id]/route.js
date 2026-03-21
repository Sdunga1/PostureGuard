import { createAuthenticatedClient } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

/**
 * GET /api/sessions/[id] — Fetch a single session by UUID
 * Requires auth — only the session owner can view it.
 */
export async function GET(request, { params }) {
  const { id } = params;

  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', requiresAuth: true }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Verify ownership — only the session creator can view it
  if (data.user_id !== user.id) {
    return NextResponse.json({
      error: 'This session belongs to a different account. Please sign in with the account used in the extension.',
      ownerMismatch: true
    }, { status: 403 });
  }

  return NextResponse.json({ session: data });
}
