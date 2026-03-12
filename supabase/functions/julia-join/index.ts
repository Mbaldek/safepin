// supabase/functions/julia-join/index.ts
//
// Invoked when Julia AI should join an escort session (Level 3 escalation).
// Currently: creates a julia_sessions record.
// Phase 2: will POST to the Python agent server on Fly.io to join the LiveKit room.
//
// Deploy: supabase functions deploy julia-join

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { escorte_id, user_id } = await req.json();

    if (!escorte_id || !user_id) {
      return new Response(JSON.stringify({ error: 'escorte_id and user_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const roomName = `escorte-${escorte_id}`;

    // 1. Create julia_sessions record
    const { data: session, error: sessionError } = await supabase
      .from('julia_sessions')
      .insert({
        user_id,
        escorte_id,
        room_name: roomName,
        session_type: 'escort_escalation',
        status: 'active',
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[julia-join] session insert error:', sessionError);
      return new Response(JSON.stringify({ error: sessionError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Update escorte record
    await supabase
      .from('escortes')
      .update({ julia_active: true })
      .eq('id', escorte_id);

    // 3. TODO Phase 2: POST to agent server on Fly.io
    // const AGENT_SERVER_URL = Deno.env.get('JULIA_AGENT_URL') ?? '';
    // if (AGENT_SERVER_URL) {
    //   await fetch(`${AGENT_SERVER_URL}/join`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       room_name: roomName,
    //       session_id: session.id,
    //       user_id,
    //       escorte_id,
    //     }),
    //   });
    // }

    console.log(`[julia-join] session=${session.id} room=${roomName} user=${user_id} escorte=${escorte_id}`);

    return new Response(
      JSON.stringify({ session_id: session.id, room_name: roomName, status: 'active' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[julia-join]', err);
    return new Response(String(err), { status: 500 });
  }
});
