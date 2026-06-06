import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Privacy Policy · MajorGBN",
  description:
    "How Major GBN Innovation Enterprise collects, uses, protects and shares personal data, and your rights under the Nigeria Data Protection Act (NDPA) 2023.",
};

const ENTITY = "Major GBN Innovation Enterprise";
const CONTACT_EMAIL = "privacy@majormaestro.com";
const ADDRESS = "14 Oduduwa Street, Car Wash Bus Stop, Oworonshoki, Lagos, Nigeria";
const LAST_UPDATED = "7 June 2026";

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 font-display text-2xl font-semibold tracking-tight text-ink">
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[15px] leading-7 text-slate-700">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">{children}</ul>;
}

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white">
      {/* Header band */}
      <section className="border-b border-slate-200 bg-ink">
        <Container className="py-16 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-bright">Legal</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            How {ENTITY} collects, uses, stores, shares and protects your personal data — and your
            rights under the Nigeria Data Protection Act (NDPA) 2023.
          </p>
          <p className="mt-4 text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
        </Container>
      </section>

      <Container className="max-w-3xl py-12 sm:py-16">
        <P>
          This Privacy Policy explains how <strong>{ENTITY}</strong> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;), the operator of the MajorGBN platform at
          majormaestro.com (the &ldquo;Platform&rdquo;), processes personal data. We act as the{" "}
          <strong>data controller</strong> for the personal data described below. We are committed to
          handling your data lawfully, fairly and transparently in line with the NDPA 2023.
        </P>

        <H2 id="who-we-are">1. Who we are &amp; how to contact us</H2>
        <P>
          <strong>Data controller:</strong> {ENTITY}
          <br />
          <strong>Registered address:</strong> {ADDRESS}
          <br />
          <strong>Privacy contact:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent hover:text-accent-bright">
            {CONTACT_EMAIL}
          </a>
        </P>
        <P>
          For any privacy question, request, or to exercise your rights, contact us at the email
          above.
        </P>

        <H2 id="data-we-collect">2. Personal data we collect</H2>
        <P>We collect only the data needed to provide our services. Depending on how you use the Platform, this may include:</P>
        <UL>
          <li>
            <strong>Forensic recovery clients (corporate):</strong> company name, RC number, annual
            turnover band, the banks you use, and the name, job title, email and phone number of your
            contact person; case findings and recovered amounts.
          </li>
          <li>
            <strong>Uploaded documents:</strong> bank statements, letters of authority and related
            financial documents you provide for an audit.
          </li>
          <li>
            <strong>Account holders:</strong> email address, name, profile image, and (if you use
            Google sign-in) your Google account identifier; technical session data including IP
            address and device/browser information.
          </li>
          <li>
            <strong>AI tools:</strong> the information you enter into our staff-classification and
            career-roadmap tools (e.g. roles, experience, attributes, certifications).
          </li>
          <li>
            <strong>GICN (youth / NGO programmes):</strong> for a registered child — full name, date
            of birth, school, class level, address and guardian name, together with the guardian/
            school consent record. A National Identification Number (NIN) is collected{" "}
            <em>only</em> in connection with a scholarship award and is stored encrypted.
          </li>
          <li>
            <strong>Referral partners &amp; marketing:</strong> name, email, bank details (for
            payouts where applicable), and company name for guide downloads.
          </li>
          <li>
            <strong>Administrators:</strong> work email, securely hashed credentials and two-factor
            authentication data.
          </li>
        </UL>

        <H2 id="children">3. Children&rsquo;s data (GICN)</H2>
        <P>
          Protecting children&rsquo;s data is a priority. <strong>Minors never hold accounts</strong>{" "}
          on the Platform. A child&rsquo;s information exists only as a dependent record owned by an
          adult parent, guardian or partner school. We capture and record{" "}
          <strong>verifiable consent</strong> from that responsible adult before creating any
          child&rsquo;s record, and we do not send communications to minors. NINs linked to
          scholarship awards are encrypted at rest. We do not use children&rsquo;s data for marketing
          or profiling.
        </P>

        <H2 id="how-we-use">4. How and why we use your data (lawful bases)</H2>
        <P>We process personal data on the following NDPA 2023 lawful bases:</P>
        <UL>
          <li><strong>Performance of a contract</strong> — to deliver recovery audits, AI tools, programme registration and account services you request.</li>
          <li><strong>Consent</strong> — for marketing communications, certain cookies, and processing of children&rsquo;s data (via the responsible adult). You may withdraw consent at any time.</li>
          <li><strong>Legal obligation</strong> — to meet record-keeping, financial, regulatory and dispute requirements.</li>
          <li><strong>Legitimate interests</strong> — to secure the Platform, prevent fraud and abuse, and improve our services, balanced against your rights.</li>
        </UL>

        <H2 id="sharing">5. Who we share your data with</H2>
        <P>
          <strong>We do not sell your personal data.</strong> We share it only with trusted service
          providers (sub-processors) who process it on our behalf under appropriate safeguards, and
          where required by law. Our sub-processors are:
        </P>
        <UL>
          <li><strong>Supabase</strong> — database hosting (primary data store), located in the EU (Frankfurt, Germany).</li>
          <li><strong>Vercel</strong> — application hosting, serverless compute and privacy-friendly, cookieless analytics.</li>
          <li><strong>Backblaze B2 / S3-compatible storage</strong> — secure storage of uploaded documents.</li>
          <li><strong>Resend</strong> — delivery of transactional emails (e.g. confirmations, magic-link sign-in).</li>
          <li><strong>Anthropic (Claude)</strong> — AI processing for the classification, roadmap and assessment tools.</li>
          <li><strong>Google</strong> — optional Google sign-in (OAuth).</li>
          <li><strong>Sentry</strong> — application error monitoring.</li>
        </UL>
        <P>
          We may also disclose data to professional advisers, or to courts, regulators and law
          enforcement where legally required, and to a successor entity in the event of a business
          transfer.
        </P>

        <H2 id="transfers">6. International transfers</H2>
        <P>
          Your data is primarily stored within the EU (Frankfurt, Germany). Some of our
          sub-processors (for example Anthropic, Google and Sentry) are based in the United States,
          so your data may be transferred outside Nigeria. Where this happens, we rely on appropriate
          safeguards and the providers&rsquo; contractual data-protection commitments, consistent with
          the NDPA 2023.
        </P>

        <H2 id="security">7. How we protect your data</H2>
        <P>We apply technical and organisational measures appropriate to the sensitivity of the data, including:</P>
        <UL>
          <li>Encryption in transit (HTTPS/HSTS) and encryption at rest for the most sensitive data (e.g. NINs and two-factor secrets, using AES-256).</li>
          <li>Hashed passwords and session tokens; signed, tamper-evident authentication cookies.</li>
          <li>Role-based access control with two-factor authentication for privileged actions, and full audit logging.</li>
          <li>Rate limiting, secure document handling, and confidentiality (NDA) for recovery engagements.</li>
        </UL>

        <H2 id="retention">8. How long we keep your data</H2>
        <P>
          We keep personal data only as long as necessary for the purposes above or as required by
          law. In particular: uploaded case documents are retained for approximately three years
          after a case is closed; audit logs for approximately two years; and expired login sessions
          are purged shortly after expiry. Some recovery case records may be retained for longer to
          meet legal and regulatory obligations, even after an associated account is deleted.
        </P>

        <H2 id="rights">9. Your rights under the NDPA 2023</H2>
        <P>Subject to applicable conditions, you have the right to:</P>
        <UL>
          <li>access the personal data we hold about you;</li>
          <li>request correction of inaccurate or incomplete data;</li>
          <li>request deletion (&ldquo;erasure&rdquo;) of your data;</li>
          <li>restrict or object to certain processing;</li>
          <li>data portability (receive your data in a usable format);</li>
          <li>withdraw consent at any time, without affecting prior lawful processing; and</li>
          <li>lodge a complaint with the Nigeria Data Protection Commission (NDPC).</li>
        </UL>
        <P>
          You can manage and delete much of your data yourself: account holders can edit details,
          manage devices and delete their account from{" "}
          <Link href="/client/account" className="font-semibold text-accent hover:text-accent-bright">your account settings</Link>,
          and recovery clients can request a copy of their case data via the{" "}
          <Link href="/recovery/track" className="font-semibold text-accent hover:text-accent-bright">case tracking page</Link>.
          For any other request, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent hover:text-accent-bright">{CONTACT_EMAIL}</a>.
        </P>

        <H2 id="cookies">10. Cookies &amp; similar technologies</H2>
        <P>We use a small number of cookies and browser-storage items:</P>
        <UL>
          <li><strong>Strictly necessary</strong> — to keep you signed in and secure your session (e.g. <code>gbn_user</code>, <code>gbn_admin</code>, sign-in state).</li>
          <li><strong>Functional</strong> — to remember referral attribution and pre-fill forms (e.g. <code>gbn_ref</code>; estimator/intake drafts stored only in your browser).</li>
          <li><strong>Analytics</strong> — privacy-friendly, cookieless aggregate usage metrics.</li>
        </UL>

        <H2 id="changes">11. Changes to this policy</H2>
        <P>
          We may update this Privacy Policy from time to time. We will revise the &ldquo;Last
          updated&rdquo; date above and, where changes are material, take reasonable steps to notify
          you.
        </P>

        <H2 id="contact">12. Contact us</H2>
        <P>
          Questions or requests about this policy or your data? Contact {ENTITY} at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent hover:text-accent-bright">{CONTACT_EMAIL}</a>{" "}
          or write to {ADDRESS}.
        </P>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link href="/" className="text-sm font-semibold text-accent hover:text-accent-bright">← Back to home</Link>
        </div>
      </Container>
    </div>
  );
}
