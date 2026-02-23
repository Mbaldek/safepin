// src/app/privacy/page.tsx — Brume Privacy Policy

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/login" className="text-xs font-bold mb-6 inline-block" style={{ color: 'var(--accent)' }}>&larr; Back to Brume</a>

        <h1 className="text-2xl font-extrabold mb-1">Privacy Policy</h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>Last updated: February 2026</p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-base font-black mb-2">1. Who We Are</h2>
            <p>
              Brume is operated by DBEK, a company registered in France at 75 rue de Lourmel, 75015 Paris, France.
              Brume provides a community-powered safety mapping and navigation platform (&ldquo;the Service&rdquo;).
              For questions about this policy, contact us at <a href="mailto:brumeapp@pm.me" style={{ color: 'var(--accent)' }}>brumeapp@pm.me</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">2. Data We Collect</h2>
            <p className="mb-2">We collect only the data necessary to provide and improve the Service:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Account data:</strong> Email address, display name, authentication provider (Google, Apple, or email).</li>
              <li><strong>Location data:</strong> GPS coordinates when you use the map, create reports, trigger SOS alerts, or use trip navigation. Location is only accessed with your explicit permission.</li>
              <li><strong>User-generated content:</strong> Safety reports (pins), photos, chat messages, place notes, saved routes.</li>
              <li><strong>Device information:</strong> Push notification tokens, browser type, and language preference.</li>
              <li><strong>Verification data:</strong> If you choose identity verification, this is processed by our third-party provider Veriff. We store only the verification status (approved/declined), not your identity documents.</li>
              <li><strong>Payment data:</strong> If you subscribe to Brume Pro, payments are processed by Stripe. We store your Stripe customer ID and subscription status, but never your card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>To provide the Service: display safety reports, route navigation, SOS alerts, push notifications.</li>
              <li>To improve safety: aggregate anonymised data to compute neighborhood safety scores and trend analysis.</li>
              <li>To communicate with you: service emails, safety alerts, magic link sign-in.</li>
              <li>To ensure security: detect abuse, enforce community guidelines, moderate content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">4. Legal Basis (GDPR Article 6)</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Consent:</strong> Location access, push notifications, identity verification.</li>
              <li><strong>Contract:</strong> Account creation, service delivery, subscription management.</li>
              <li><strong>Legitimate interest:</strong> Security, abuse prevention, anonymised analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">5. Data Sharing</h2>
            <p className="mb-2">We do <strong>not</strong> sell your data. We share data only with:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Supabase</strong> (database & authentication) — EU-hosted infrastructure.</li>
              <li><strong>Mapbox</strong> (maps & geocoding) — processes coordinates for map display.</li>
              <li><strong>Veriff</strong> (identity verification) — only if you opt in to verification.</li>
              <li><strong>Stripe</strong> (payments) — only if you subscribe to Pro.</li>
              <li><strong>Vercel</strong> (hosting) — serves the application.</li>
            </ul>
            <p className="mt-2">All processors comply with GDPR or have adequate safeguards in place.</p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">6. Data Retention</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Account data: retained while your account is active, deleted within 30 days of account deletion.</li>
              <li>Safety reports: retained indefinitely to maintain the community safety map. Reports are anonymised after 12 months.</li>
              <li>Location history (Pro feature): retained for 90 days, then automatically deleted.</li>
              <li>Chat messages: retained for 12 months.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">7. Your Rights (GDPR Articles 15–22)</h2>
            <p className="mb-2">As an EU resident, you have the right to:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Rectification:</strong> Correct inaccurate data.</li>
              <li><strong>Erasure:</strong> Delete your account and all associated data (Settings &rarr; Privacy &rarr; Delete Account).</li>
              <li><strong>Portability:</strong> Export your data in machine-readable format.</li>
              <li><strong>Restriction:</strong> Limit processing under certain conditions.</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interest.</li>
              <li><strong>Withdraw consent:</strong> At any time, without affecting prior processing.</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email <a href="mailto:brumeapp@pm.me" style={{ color: 'var(--accent)' }}>brumeapp@pm.me</a>.
              We respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">8. Security</h2>
            <p>
              We use industry-standard security measures including encrypted connections (TLS 1.3), row-level security
              on our database, HMAC-signed webhooks, and secure authentication via Supabase Auth. All data is stored
              in EU data centres.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">9. Children</h2>
            <p>
              Brume is not directed to children under 16. We do not knowingly collect data from children.
              If you believe a child has provided us data, contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be notified via the app
              or email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">11. Contact & Supervisory Authority</h2>
            <p>
              Data controller: DBEK, 75 rue de Lourmel, 75015 Paris, France.<br />
              Email: <a href="mailto:brumeapp@pm.me" style={{ color: 'var(--accent)' }}>brumeapp@pm.me</a><br />
              You may also lodge a complaint with the French data protection authority:
              CNIL, 3 Place de Fontenoy, 75007 Paris (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>www.cnil.fr</a>).
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 text-center text-[0.6rem]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-placeholder)' }}>
          &copy; {new Date().getFullYear()} Brume by DBEK. All rights reserved.
        </div>
      </div>
    </div>
  );
}
