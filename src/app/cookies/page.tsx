// src/app/cookies/page.tsx — KOVA Cookie Policy

export default function CookiesPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/login" className="text-xs font-bold mb-6 inline-block" style={{ color: 'var(--accent)' }}>&larr; Back to KOVA</a>

        <h1 className="text-2xl font-extrabold mb-1">Cookie Policy</h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>Last updated: February 2026</p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-base font-black mb-2">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They help the site remember your preferences and improve your experience.
              KOVA uses minimal cookies — only what is strictly necessary to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">2. Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-2" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left py-2 pr-3 font-black">Cookie</th>
                    <th className="text-left py-2 pr-3 font-black">Purpose</th>
                    <th className="text-left py-2 pr-3 font-black">Type</th>
                    <th className="text-left py-2 font-black">Duration</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-muted)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-3 font-mono">sb-*-auth-token</td>
                    <td className="py-2 pr-3">Authentication session (Supabase)</td>
                    <td className="py-2 pr-3">Essential</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-3 font-mono">NEXT_LOCALE</td>
                    <td className="py-2 pr-3">Stores your language preference</td>
                    <td className="py-2 pr-3">Essential</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-3 font-mono">kova_theme</td>
                    <td className="py-2 pr-3">Stores your dark/light theme preference</td>
                    <td className="py-2 pr-3">Functional</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">3. Local Storage</h2>
            <p className="mb-2">
              In addition to cookies, KOVA uses browser local storage for app functionality:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>kova_active_trip:</strong> Persists active trip navigation state.</li>
              <li><strong>kova_last_session_ts:</strong> Tracks when you last visited (for session briefing).</li>
              <li><strong>kova_notifications_enabled:</strong> Push notification preference.</li>
              <li><strong>Offline queue (IndexedDB):</strong> Stores reports created while offline for later sync.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">4. Third-Party Cookies</h2>
            <p>
              KOVA does <strong>not</strong> use any third-party tracking, analytics, or advertising cookies.
              We do not use Google Analytics, Facebook Pixel, or any similar tracking tools.
              The only third-party services that may set cookies are:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li><strong>Supabase:</strong> Authentication cookies (essential, first-party equivalent).</li>
              <li><strong>Stripe:</strong> Fraud prevention cookies during checkout (only when you initiate payment).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">5. Managing Cookies</h2>
            <p>
              Since KOVA only uses essential and functional cookies, we do not display a cookie consent banner.
              Under the ePrivacy Directive, consent is not required for cookies strictly necessary to provide the Service.
            </p>
            <p className="mt-2">
              You can delete cookies at any time through your browser settings. Note that deleting
              authentication cookies will sign you out, and deleting local storage will reset your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">6. Changes</h2>
            <p>
              We may update this Cookie Policy if we introduce new features that require additional cookies.
              Any changes will be reflected on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">7. Contact</h2>
            <p>
              If you have questions about our use of cookies, contact us at{' '}
              <a href="mailto:kovaapp@pm.me" style={{ color: 'var(--accent)' }}>kovaapp@pm.me</a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 text-center text-[0.6rem]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-placeholder)' }}>
          &copy; {new Date().getFullYear()} KOVA by DBEK. All rights reserved.
        </div>
      </div>
    </div>
  );
}
