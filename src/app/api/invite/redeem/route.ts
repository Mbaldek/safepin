// src/app/api/invite/redeem/route.ts — Redeem an invite code (auth required)

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSessionUserId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, reason: 'missing_code' }, { status: 400 });
    }

    const normalized = code.toUpperCase().trim();
    const admin = createAdminClient();

    // Check if user already redeemed a code
    const { data: existing } = await admin
      .from('invite_code_uses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, reason: 'already_redeemed' });
    }

    // Fetch and validate the code
    const { data: codeData, error } = await admin
      .from('invite_codes')
      .select('id, code, organization_name, max_uses, used_count, is_active, expires_at')
      .eq('code', normalized)
      .single();

    if (error || !codeData) {
      return NextResponse.json({ success: false, reason: 'not_found' });
    }

    if (!codeData.is_active) {
      return NextResponse.json({ success: false, reason: 'inactive' });
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return NextResponse.json({ success: false, reason: 'expired' });
    }

    if (codeData.used_count >= codeData.max_uses) {
      return NextResponse.json({ success: false, reason: 'full' });
    }

    // Atomic increment with optimistic lock
    const { data: updated, error: updateErr } = await admin
      .from('invite_codes')
      .update({ used_count: codeData.used_count + 1 })
      .eq('id', codeData.id)
      .eq('used_count', codeData.used_count) // optimistic lock
      .select('id')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ success: false, reason: 'race_condition' }, { status: 409 });
    }

    // Record usage
    await admin.from('invite_code_uses').insert({
      invite_code_id: codeData.id,
      user_id: userId,
    });

    // Link profile
    await admin
      .from('profiles')
      .update({ invite_code_id: codeData.id })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      organization_name: codeData.organization_name,
    });
  } catch {
    return NextResponse.json({ success: false, reason: 'error' }, { status: 500 });
  }
}
