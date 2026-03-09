import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/admin-bypass?email=you@example.com
 * Dev-only: ensures profile + onboarding done, returns a page that
 * sets localStorage/cookie then sends a magic link to your email.
 *
 * Flow: hit this URL → check email → click link → lands on /map.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing ?email= param' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find user
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Ensure profile exists with onboarding complete
  await admin.from('profiles').upsert({
    id: user.id,
    name: 'Admin',
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
    is_admin: true,
  }, { onConflict: 'id' });

  // Send a magic link email via Supabase (user clicks it to get a session)
  const { error: otpError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${url.origin}/auth/callback?next=/map` },
  });

  if (otpError) {
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  // Return HTML page that sets localStorage + cookie + shows confirmation
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin Bypass</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0F172A;color:#fff;text-align:center}
.card{background:#1E293B;padding:40px;border-radius:16px;max-width:400px}
h2{margin:0 0 12px;font-size:20px}p{color:#94A3B8;font-size:14px;line-height:1.5}</style></head>
<body>
<div class="card">
<h2>Admin Bypass</h2>
<p>Profile set to admin + onboarding complete.</p>
<p>Now log in via the onboarding email step, then you'll land on /map directly.</p>
<p style="margin-top:16px"><a href="/onboarding" style="color:#3BB4C1">Go to onboarding →</a></p>
</div>
<script>
localStorage.setItem('breveil_onboarding_done','1');
document.cookie='ob_done=1;path=/;max-age=31536000';
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
