// src/app/api/circle/invite/route.ts
// Sends a circle invitation email after a trusted contact is added.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase-admin';
import { circleInvitationEmail } from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.breveil.com';

export async function POST(req: NextRequest) {
  // Auth check
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contactId } = await req.json() as { contactId: string };
  if (!contactId) {
    return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: false, reason: 'email_not_configured' });
  }

  const admin = createAdminClient();

  try {
    // Get inviter name
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const inviterName = inviterProfile?.display_name ?? 'Un membre Breveil';

    // Get contact profile + email
    const { data: contactProfile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', contactId)
      .single();
    const recipientName = contactProfile?.display_name ?? 'there';

    const { data: { user: authUser } } = await admin.auth.admin.getUserById(contactId);
    if (!authUser?.email) {
      return NextResponse.json({ sent: false, reason: 'no_email' });
    }

    const inviteLink = `${APP_URL}/map`;
    const template = circleInvitationEmail({ recipientName, inviterName, inviteLink });
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Breveil <onboarding@resend.dev>',
      to: authUser.email,
      subject: template.subject,
      html: template.html,
    });

    return NextResponse.json({ sent: true });
  } catch (err: unknown) {
    console.error('[Email] Circle invitation failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ sent: false, reason: 'email_error' });
  }
}
