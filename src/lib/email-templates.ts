// src/lib/email-templates.ts — Lifecycle email HTML templates for Breveil

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.breveil.com';

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
  <div style="background:#0F172A;padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Brev<span style="color:#F5C341;">eil</span></h1>
  </div>
  <div style="padding:32px;">
    ${body}
  </div>
  <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
    <p style="margin:0;font-size:11px;color:#a1a1aa;">Breveil &mdash; Making cities safer, together.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#a1a1aa;">DBEK &mdash; 75 rue de Lourmel, 75015 Paris, France</p>
  </div>
</div></body></html>`;
}

export function welcomeEmail(displayName: string | null) {
  const name = displayName || 'there';
  return {
    subject: 'Welcome to Breveil — your safety network is live',
    html: wrap('Welcome to Breveil', `
      <h2 style="margin:0 0 16px;font-size:22px;color:#18181b;">Hey ${name}, welcome aboard!</h2>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        You just joined a community of people making their city safer. Here are three things you can do right now:
      </p>
      <ol style="color:#3f3f46;font-size:15px;line-height:1.8;padding-left:20px;">
        <li><strong>Report</strong> anything you notice on your route</li>
        <li><strong>Confirm</strong> reports from others near you</li>
        <li><strong>Save</strong> your frequent routes to get alerts</li>
      </ol>
      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${APP_URL}/map" style="display:inline-block;padding:12px 32px;background:#0F172A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Open the Map</a>
      </div>
    `),
  };
}

export function firstReportEmail(displayName: string | null) {
  const name = displayName || 'there';
  return {
    subject: 'Your first report is live — nice work!',
    html: wrap('First Report', `
      <h2 style="margin:0 0 16px;font-size:22px;color:#18181b;">Great job, ${name}!</h2>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        You just posted your first safety report. The people around you can now see it, confirm it, and stay informed.
      </p>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        Every report helps the community — keep it up and you will start building your streak and unlocking milestones.
      </p>
      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${APP_URL}/map" style="display:inline-block;padding:12px 32px;background:#0F172A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">See your report</a>
      </div>
    `),
  };
}

export function inactiveReengagementEmail(displayName: string | null) {
  const name = displayName || 'there';
  return {
    subject: 'Your neighborhood misses you',
    html: wrap('We miss you', `
      <h2 style="margin:0 0 16px;font-size:22px;color:#18181b;">Hey ${name}, it has been a while!</h2>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        Your area might have new safety reports since you last visited. A quick check-in helps keep the community informed.
      </p>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        Come back to confirm or add reports and restart your daily streak.
      </p>
      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${APP_URL}/map" style="display:inline-block;padding:12px 32px;background:#0F172A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Check your area</a>
      </div>
    `),
  };
}

export function streakMilestoneEmail(displayName: string | null, streak: number) {
  const name = displayName || 'there';
  const emoji = streak >= 30 ? '\u{1F48E}' : '\u26A1';
  const next = streak === 7 ? '14 days' : '60 days';
  return {
    subject: `${emoji} ${streak}-day streak — you are on fire!`,
    html: wrap('Streak Milestone', `
      <h2 style="margin:0 0 16px;font-size:22px;color:#18181b;">${emoji} ${streak}-day streak!</h2>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        Amazing, ${name}! You have been active for ${streak} days straight. That kind of consistency makes a real difference for the safety of your community.
      </p>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
        Keep it going — your next milestone is ${next}.
      </p>
      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${APP_URL}/map" style="display:inline-block;padding:12px 32px;background:#0F172A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Keep the streak alive</a>
      </div>
    `),
  };
}
