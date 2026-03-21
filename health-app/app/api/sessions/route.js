import { createAuthenticatedClient } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

/**
 * GET /api/sessions — List the user's recent sessions
 */
export async function GET(request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

/**
 * POST /api/sessions — Save a new posture session
 * Body: { sessionData: {...}, claudeAnalysis: {...} }
 */
export async function POST(request) {
  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionData, claudeAnalysis } = await request.json();

  if (!sessionData) {
    return NextResponse.json({ error: 'Missing session data' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      session_id: sessionData.sessionId || null,
      start_time: sessionData.startTime || new Date().toISOString(),
      end_time: sessionData.endTime || new Date().toISOString(),
      duration_seconds: sessionData.duration || 0,
      avg_score: sessionData.metrics?.avgPostureScore || null,
      alert_count: sessionData.metrics?.alertCount || 0,
      metrics: sessionData.metrics || {},
      claude_analysis: claudeAnalysis || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Session save error:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, success: true });
}
