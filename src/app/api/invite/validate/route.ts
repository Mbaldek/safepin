// src/app/api/invite/validate/route.ts — Public invite code validation

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, reason: 'missing_code' }, { status: 400 });
    }

    const normalized = code.toUpperCase().trim();
    if (normalized.length < 3 || normalized.length > 20) {
      return NextResponse.json({ valid: false, reason: 'invalid_format' });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('invite_codes')
      .select('id, code, organization_name, max_uses, used_count, is_active, expires_at')
      .eq('code', normalized)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    if (!data.is_active) {
      return NextResponse.json({ valid: false, reason: 'inactive' });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    if (data.used_count >= data.max_uses) {
      return NextResponse.json({ valid: false, reason: 'full' });
    }

    return NextResponse.json({
      valid: true,
      organization_name: data.organization_name,
      spots_remaining: data.max_uses - data.used_count,
    });
  } catch {
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 });
  }
}
