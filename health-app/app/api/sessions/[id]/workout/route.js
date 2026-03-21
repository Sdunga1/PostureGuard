import { createAuthenticatedClient } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/sessions/[id]/workout — Save workout completion data
 * Merges workout_data into the session's metrics JSONB column.
 * Requires auth — only the session owner can update it.
 */
export async function PATCH(request, { params }) {
  const { id } = params;

  const { supabase, user } = await createAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', requiresAuth: true }, { status: 401 });
  }

  // Fetch existing session to verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({
      error: 'This session belongs to a different account.',
      ownerMismatch: true
    }, { status: 403 });
  }

  try {
    const { exercises, activeTimeMinutes, completedAt } = await request.json();

    const updatedMetrics = {
      ...(existing.metrics || {}),
      workout_data: {
        exercises,
        activeTimeMinutes,
        completedAt,
        exerciseCount: exercises?.length || 0
      }
    };

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ metrics: updatedMetrics })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
