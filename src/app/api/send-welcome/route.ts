import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase-admin';
import { welcomeEmail } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { userId } = (await req.json()) as { userId?: string };
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const admin = createAdminClient();

    // Get profile for display name + email
    const { data: profile } = await admin
      .from('profiles')
      .select('pseudo, email')
      .eq('id', userId)
      .single();

    const email = profile?.email;
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

    // Deduplicate — skip if already sent
    const { data: existing } = await admin
      .from('email_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .limit(1)
      .single();

    if (existing) return NextResponse.json({ skipped: true });

    const template = welcomeEmail(profile?.pseudo || null);

    const { data, error } = await resend.emails.send({
      from: 'Breveil <hello@breveil.app>',
      to: email,
      subject: template.subject,
      html: template.html,
    });

    await admin.from('email_logs').insert({
      user_id: userId,
      email_type: 'welcome',
      recipient: email,
      status: error ? 'failed' : 'sent',
      resend_id: data?.id ?? null,
      error_message: error?.message ?? null,
    });

    return NextResponse.json({ sent: !error });
  } catch (e) {
    console.error('[send-welcome] Error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
