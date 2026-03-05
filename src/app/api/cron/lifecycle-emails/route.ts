// src/app/api/cron/lifecycle-emails/route.ts
// Lifecycle email cron — called every hour by Vercel Cron.
// Finds eligible users for each gate, checks email_logs for dedup, sends via Resend.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  welcomeEmail,
  firstReportEmail,
  inactiveReengagementEmail,
  streakMilestoneEmail,
} from '@/lib/email-templates';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}
const FROM = 'Breveil <onboarding@resend.dev>';

type Results = { welcome: number; first_report: number; inactive: number; streak: number; errors: number };

async function sendAndLog(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  emailType: string,
  template: { subject: string; html: string },
): Promise<boolean> {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    await admin.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      recipient: email,
      status: error ? 'failed' : 'sent',
      resend_id: data?.id ?? null,
      error_message: error?.message ?? null,
    });
    return !error;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await admin.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      recipient: email,
      status: 'failed',
      error_message: msg,
    });
    return false;
  }
}

/** Get email for a user via Supabase Auth admin API */
async function getUserEmail(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  const { data: { user } } = await admin.auth.admin.getUserById(userId);
  return user?.email ?? null;
}

/** Get user IDs that already received a specific email type */
async function getSentUserIds(admin: ReturnType<typeof createAdminClient>, emailType: string): Promise<Set<string>> {
  const { data } = await admin
    .from('email_logs')
    .select('user_id')
    .eq('email_type', emailType)
    .eq('status', 'sent');
  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
}

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron sends Bearer token automatically
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const results: Results = { welcome: 0, first_report: 0, inactive: 0, streak: 0, errors: 0 };

  // Load gate config from admin_params
  const { data: paramsRows } = await admin
    .from('admin_params')
    .select('key, value')
    .in('key', [
      'email_gate_welcome',
      'email_gate_first_report',
      'email_gate_inactive_reengagement',
      'email_gate_streak_milestone',
    ]);
  const gates: Record<string, boolean> = {};
  for (const row of paramsRows ?? []) {
    gates[row.key] = row.value === 'true';
  }

  // ── Gate 1: Welcome (after onboarding completion) ─────────────────────────
  if (gates['email_gate_welcome'] !== false) {
    const sentSet = await getSentUserIds(admin, 'welcome');

    const { data: eligible } = await admin
      .from('profiles')
      .select('id, display_name')
      .not('onboarding_completed_at', 'is', null)
      .or('is_simulated.is.null,is_simulated.eq.false');

    for (const user of (eligible ?? []).filter((u: { id: string }) => !sentSet.has(u.id))) {
      const email = await getUserEmail(admin, user.id);
      if (!email) continue;
      const template = welcomeEmail(user.display_name);
      const ok = await sendAndLog(admin, user.id, email, 'welcome', template);
      if (ok) results.welcome++;
      else results.errors++;
    }
  }

  // ── Gate 2: First Report (user has exactly 1 pin) ─────────────────────────
  if (gates['email_gate_first_report'] !== false) {
    const sentSet = await getSentUserIds(admin, 'first_report');

    // Count pins per user — more reliable than engagement_events
    const { data: allPins } = await admin
      .from('pins')
      .select('user_id')
      .or('is_simulated.is.null,is_simulated.eq.false');

    const countMap: Record<string, number> = {};
    for (const row of allPins ?? []) {
      countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1;
    }

    const firstTimeIds = Object.entries(countMap)
      .filter(([, count]) => count === 1)
      .map(([id]) => id)
      .filter((id) => !sentSet.has(id));

    if (firstTimeIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', firstTimeIds);

      for (const p of profiles ?? []) {
        const email = await getUserEmail(admin, p.id);
        if (!email) continue;
        const template = firstReportEmail(p.display_name);
        const ok = await sendAndLog(admin, p.id, email, 'first_report', template);
        if (ok) results.first_report++;
        else results.errors++;
      }
    }
  }

  // ── Gate 3: Inactive Re-engagement (7 days without login) ─────────────────
  if (gates['email_gate_inactive_reengagement'] !== false) {
    const sentSet = await getSentUserIds(admin, 'inactive_reengagement');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: inactive } = await admin
      .from('profiles')
      .select('id, display_name')
      .not('onboarding_completed_at', 'is', null)
      .not('last_active_date', 'is', null)
      .lte('last_active_date', cutoff)
      .or('is_simulated.is.null,is_simulated.eq.false');

    for (const user of (inactive ?? []).filter((u: { id: string }) => !sentSet.has(u.id))) {
      const email = await getUserEmail(admin, user.id);
      if (!email) continue;
      const template = inactiveReengagementEmail(user.display_name);
      const ok = await sendAndLog(admin, user.id, email, 'inactive_reengagement', template);
      if (ok) results.inactive++;
      else results.errors++;
    }
  }

  // ── Gate 4: Streak Milestone (7 or 30 days) ───────────────────────────────
  if (gates['email_gate_streak_milestone'] !== false) {
    for (const milestone of [7, 30]) {
      const emailType = `streak_milestone_${milestone}`;
      const sentSet = await getSentUserIds(admin, emailType);

      const { data: eligible } = await admin
        .from('profiles')
        .select('id, display_name, current_streak')
        .gte('current_streak', milestone)
        .or('is_simulated.is.null,is_simulated.eq.false');

      for (const user of (eligible ?? []).filter((u: { id: string }) => !sentSet.has(u.id))) {
        const email = await getUserEmail(admin, user.id);
        if (!email) continue;
        const template = streakMilestoneEmail(user.display_name, milestone);
        const ok = await sendAndLog(admin, user.id, email, emailType, template);
        if (ok) results.streak++;
        else results.errors++;
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
