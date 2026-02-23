// src/app/terms/page.tsx — Brume Terms of Service

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/login" className="text-xs font-bold mb-6 inline-block" style={{ color: 'var(--accent)' }}>&larr; Back to Brume</a>

        <h1 className="text-2xl font-extrabold mb-1">Terms of Service</h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>Last updated: February 2026</p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-base font-black mb-2">1. Acceptance</h2>
            <p>
              By accessing or using Brume (&ldquo;the Service&rdquo;), you agree to these Terms of Service.
              If you do not agree, do not use the Service. The Service is operated by DBEK,
              75 rue de Lourmel, 75015 Paris, France.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">2. Description of Service</h2>
            <p>
              Brume is a community-powered safety mapping platform that allows users to report safety incidents,
              navigate with safety-aware routing, trigger emergency alerts, and communicate with their community.
              Brume does <strong>not</strong> replace emergency services. In case of immediate danger, always call
              your local emergency number (15, 17, 18, or 112 in France/EU).
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">3. Account Registration</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You must be at least 16 years old to create an account.</li>
              <li>You must provide accurate information and keep your account secure.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>One account per person. Duplicate or fake accounts may be terminated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">4. Acceptable Use</h2>
            <p className="mb-2">You agree <strong>not</strong> to:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Submit false, misleading, or malicious safety reports.</li>
              <li>Use the SOS system for non-emergency purposes.</li>
              <li>Harass, threaten, or target other users.</li>
              <li>Post content that is illegal, hateful, discriminatory, or sexually explicit.</li>
              <li>Attempt to access other users&apos; accounts or private data.</li>
              <li>Use automated tools to scrape data or abuse the Service.</li>
              <li>Circumvent moderation, bans, or security measures.</li>
            </ul>
            <p className="mt-2">
              Violations may result in content removal, account suspension, or permanent ban.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">5. User-Generated Content</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You retain ownership of content you create (reports, photos, messages).</li>
              <li>By posting, you grant Brume a worldwide, royalty-free licence to display, distribute, and process your content as part of the Service.</li>
              <li>Brume may remove content that violates these Terms or community guidelines.</li>
              <li>Reports may be anonymised and used in aggregate to improve community safety.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">6. Brume Pro Subscription</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Brume Pro is available as a monthly or annual subscription.</li>
              <li>Payment is processed by Stripe. Prices are displayed before purchase.</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li>You can manage or cancel your subscription in Settings &rarr; Billing.</li>
              <li>Refunds are handled per Stripe&apos;s refund policy and applicable consumer protection laws.</li>
              <li>Under EU law, you have a 14-day withdrawal right for digital subscriptions, which you waive upon accessing Pro features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">7. Emergency Features Disclaimer</h2>
            <p>
              Brume provides tools to alert your contacts and share your location in emergencies.
              However, <strong>Brume is not an emergency service</strong>. We do not guarantee response
              times, availability, or the accuracy of user-generated safety data. Always contact official
              emergency services (112, 15, 17, 18) when in danger.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">8. Identity Verification</h2>
            <p>
              Optional identity verification is provided by Veriff. Verification confirms that you are
              a real person but does not imply endorsement or background checking. Brume is not responsible
              for the actions of verified users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Brume and DBEK are not liable for: (a) the accuracy
              of user-generated safety reports, (b) any harm arising from reliance on the Service,
              (c) service interruptions or data loss, (d) actions of other users. The Service is provided
              &ldquo;as is&rdquo; without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">10. Intellectual Property</h2>
            <p>
              The Brume name, logo, design, and software are the property of DBEK. You may not copy,
              modify, or distribute any part of the Service without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">11. Termination</h2>
            <p>
              You may delete your account at any time (Settings &rarr; Privacy &rarr; Delete Account).
              We may suspend or terminate accounts that violate these Terms. Upon termination, your
              data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">12. Governing Law & Disputes</h2>
            <p>
              These Terms are governed by French law. Any disputes shall be submitted to the competent
              courts of Paris, France. For EU consumers, mandatory consumer protection laws of your
              country of residence may also apply.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">13. Changes</h2>
            <p>
              We may update these Terms. Material changes will be notified in-app or by email.
              Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black mb-2">14. Contact</h2>
            <p>
              DBEK, 75 rue de Lourmel, 75015 Paris, France.<br />
              Email: <a href="mailto:kovaapp@pm.me" style={{ color: 'var(--accent)' }}>kovaapp@pm.me</a>
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
