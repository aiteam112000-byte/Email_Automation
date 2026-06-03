import React from "react";
import heroImage from "../assests/hero.jpg";
import automationImage from "../assests/automation.jpg";
import gmailOuthImage from "../assests/gmail-outh.jpg";
import validationImage from "../assests/validation.jpg";
import emailValidateImage from "../assests/email-validate.png";
import openClickImage from "../assests/open-click.png";
import gmailFooterImage from "../assests/gmail-footer.jpg";
import logo5 from "../client logos/5.png";
import logo8x8 from "../client logos/8x8.png";
import logoAdobe from "../client logos/Adobe.png";
import logoAWS from "../client logos/AWS.png";
import logoCisco from "../client logos/cisco.png";
import logoCrestron from "../client logos/Crestron.png";
import logoEquinix from "../client logos/Equinix.png";
import logoKyndryl from "../client logos/Kyndryl.png";
import logoNice from "../client logos/Nice.png";
import logoSentinel from "../client logos/Sentinel One.png";
import logoSiemens from "../client logos/Siemens.png";
import logoSingtel from "../client logos/Singtel.png";
import logoTwilio from "../client logos/Twilio.png";
import "./landing.css";

export default function LandingPage() {
  const trustedLogos = [
    { src: logo5, alt: "5 logo" },
    { src: logo8x8, alt: "8x8 logo" },
    { src: logoAdobe, alt: "Adobe logo" },
    { src: logoAWS, alt: "AWS logo" },
    { src: logoCisco, alt: "Cisco logo" },
    { src: logoCrestron, alt: "Crestron logo" },
    { src: logoEquinix, alt: "Equinix logo" },
    { src: logoKyndryl, alt: "Kyndryl logo" },
    { src: logoNice, alt: "Nice logo" },
    { src: logoSentinel, alt: "Sentinel One logo" },
    { src: logoSiemens, alt: "Siemens logo" },
    { src: logoSingtel, alt: "Singtel logo" },
    { src: logoTwilio, alt: "Twilio logo" },
  ];

  return (
    <div className="landing-home">
      {/* ─── NAV ─── */}
      <nav className="lh-nav">
        <a href="#" className="lh-nav-logo">
          <div className="lh-nav-logo-icon">✉</div>
          GTM Reach
        </a>
        <ul className="lh-nav-links">
          <li><a href="#">Product ▾</a></li>
          <li><a href="#">Solutions</a></li>
          <li><a href="#">Resources ▾</a></li>
          <li><a href="#">Pricing</a></li>
        </ul>
        <div className="lh-nav-actions">
          <button className="lh-btn-ghost">Sign in</button>
          <button className="lh-btn-primary">Start for free</button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="lh-hero">
        {/* <div className="lh-hero-badge">📧 Email Intelligence Platform for GTM Teams</div> */}
        <div className="lh-hero-content">
          {/* LEFT */}
          <div className="lh-hero-left">
            <h1 className="lh-hero-title">
              The Revenue Engine<br />
              for Modern<br />
              <span>GTM Teams.</span>
            </h1>
            <p className="lh-hero-desc">
              Validate emails, launch personalized campaigns, track every engagement,
              and automate follow-ups — all in one powerful platform.
            </p>
            <div className="lh-hero-checks">
              {["Gmail OAuth Sending", "Real-time Validation", "Workflow Automation"].map((c) => (
                <span key={c} className="lh-hero-check">
                  <span className="lh-hero-check-icon">✓</span>
                  {c}
                </span>
              ))}
            </div>
            <div className="lh-hero-cta">
              <button className="lh-btn-hero-primary">Start for free →</button>
              <button className="lh-btn-hero-outline">Book a demo</button>
            </div>
            <div className="lh-hero-meta">
              <span>⊘ No credit card required</span>
              <span>⏱ Setup in 2 minutes</span>
            </div>
          </div>

          {/* RIGHT — mockup */}
          <div className="lh-hero-right">
            <div className="lh-hero-media">
              <img src={heroImage} alt="GTM Reach dashboard preview" />
              <div className="lh-hero-media-overlay">
                <span className="lh-hero-media-pill">Campaign automation made effortless</span>
                <div className="lh-hero-media-stats">
                  <span>+22% open rates</span>
                  <span>+18% replies</span>
                </div>
              </div>
            </div>
            {/* Dashboard mockup removed — hero uses the image only */}
          </div>
        </div>
      </section>

      {/* ─── TRUSTED BY ─── */}
      <section className="lh-trusted">
        <div className="lh-trusted-track">
          <div className="lh-trusted-logos">
            {trustedLogos.concat(trustedLogos).map((logo, index) => (
              <div key={index} className="lh-trusted-logo">
                <img src={logo.src} alt={logo.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lh-image-showcase">
        <div className="lh-showcase-card">
          <img src={automationImage} alt="Automated campaign workflow" />
          <div className="lh-showcase-copy">
            <span>Automate campaigns</span>
            <h3>Launch sequences with human-like timing</h3>
            <p>Use automation rules, AI signals, and Gmail integration to turn outreach into pipeline.</p>
          </div>
        </div>
        <div className="lh-showcase-card">
          <img src={validationImage} alt="Email validation dashboard" />
          <div className="lh-showcase-copy">
            <span>Validate every address</span>
            <h3>Clean lists before you send</h3>
            <p>Protect your deliverability with instant validation, MX checks, and risk scoring.</p>
          </div>
        </div>
        <div className="lh-showcase-card">
          <img src={openClickImage} alt="Track opens and clicks" />
          <div className="lh-showcase-copy">
            <span>Track real engagement</span>
            <h3>See opens, clicks, and replies live</h3>
            <p>Monitor everything from inbox to pipeline and optimize campaigns in real time.</p>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="lh-stats">
        {[
          { icon: "✈", value: "499M+", label: "Emails Delivered" },
          { icon: "👁", value: "42M+", label: "Opens Tracked" },
          { icon: "↗", value: "12M+", label: "Clicks Recorded" },
          { icon: "🛡", value: "99.9%", label: "Validation Accuracy" },
        ].map((s) => (
          <div key={s.label} className="lh-stats-item">
            <div className="lh-stats-icon">{s.icon}</div>
            <div>
              <div className="lh-stats-value">{s.value}</div>
              <div className="lh-stats-label">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ─── FEATURES ─── */}
      <section className="lh-features">
        <h2 className="lh-section-title">
          Everything you need to<br />
          build <span>pipeline</span> and close deals.
        </h2>
        <div className="lh-features-grid">
          {/* Card 1: Gmail OAuth */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">01</div>
            <div className="lh-feature-title">Scale with Gmail OAuth</div>
            <p className="lh-feature-desc">
              Connect unlimited Gmail accounts and send at scale with maximum deliverability.
            </p>
            <div className="lh-feature-preview lh-feature-image-preview">
              <img src={gmailOuthImage} alt="Gmail OAuth connection" className="lh-feature-asset" />
              <div className="lh-gmail-connected">
                <div className="lh-gmail-connected-icon">📧</div>
                <div>
                  <div className="lh-gmail-connected-text">M 5 Connected</div>
                  <div className="lh-connected-avatars">
                    {[{ bg: "#ef4444" }, { bg: "#3b82f6" }, { bg: "#22c55e" }, { bg: "#f59e0b" }, { bg: "#8b5cf6" }].map((a, i) => (
                      <div key={i} className="lh-avatar" style={{ background: a.bg }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Visual Workflows */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">02</div>
            <div className="lh-feature-title">Automate with Visual Workflows</div>
            <p className="lh-feature-desc">
              Build powerful multi-step sequences with triggers, conditions, waits, and actions.
            </p>
            <div className="lh-feature-preview">
              <div className="lh-wf-preview">
                <div className="lh-wf-node trigger">Trigger</div>
                <span className="lh-wf-connector">→</span>
                <div className="lh-wf-node wait">Wait 3 Days</div>
                <span className="lh-wf-connector">→</span>
                <div className="lh-wf-node action">Send Email</div>
                <span className="lh-wf-connector">→</span>
                <div className="lh-wf-node" style={{ background: "#fee2e2", color: "#ef4444" }}>Reminder</div>
              </div>
            </div>
          </div>

          {/* Card 3: Verify Email */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">03</div>
            <div className="lh-feature-title">Verify Every Email</div>
            <p className="lh-feature-desc">
              Bulk validate emails, check MX records, and protect your sender reputation.
            </p>
            <div className="lh-feature-preview lh-feature-image-preview">
              <img src={emailValidateImage} alt="Email validation preview" className="lh-feature-asset" />
              <div className="lh-email-list">
                {[
                  { addr: "john@company.com", status: "Valid", cls: "valid" },
                  { addr: "ann@startup.io", status: "Valid", cls: "valid" },
                  { addr: "hello@agency.com", status: "Risky", cls: "risky" },
                  { addr: "test@invalid.com", status: "Invalid", cls: "invalid" },
                ].map((e) => (
                  <div key={e.addr} className="lh-email-row">
                    <span className="lh-email-addr">{e.addr}</span>
                    <span className={`lh-email-status ${e.cls}`}>{e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Track Engagement */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">04</div>
            <div className="lh-feature-title">Track Real Engagement</div>
            <p className="lh-feature-desc">
              Per-recipient tracking pixels and link tracking for accurate opens & clicks.
            </p>
            <div className="lh-feature-preview">
              <div className="lh-engagement-list">
                {[
                  { name: "Sarah opened", time: "2h ago", bg: "#3b82f6", l: "S" },
                  { name: "Mike clicked", time: "4h ago", bg: "#22c55e", l: "M" },
                  { name: "Alex opened", time: "1d ago", bg: "#f59e0b", l: "A" },
                ].map((e) => (
                  <div key={e.name} className="lh-eng-row">
                    <div className="lh-eng-avatar" style={{ background: e.bg }}>{e.l}</div>
                    <span className="lh-eng-name">{e.name}</span>
                    <span className="lh-eng-time">{e.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW BUILDER SECTION ─── */}
      <section className="lh-workflow-section">
        <div>
          <div className="lh-wf-badge">⚡ Visual Workflow Builder</div>
          <h2 className="lh-wf-title">
            Automate follow-ups<br />
            without engineering.
          </h2>
          <p className="lh-wf-desc">
            Drag, drop, and connect steps to create powerful email workflows. Trigger by events,
            set conditions, wait, branch, and engage at every step.
          </p>
          <ul className="lh-wf-bullets">
            <li>Trigger by events (all, opened, clicked)</li>
            <li>If/Else conditions with Yes/No branching</li>
            <li>Wait steps: minutes, hours, or days</li>
            <li>Update or remove tags automatically</li>
            <li>Send emails at every step</li>
          </ul>
          <button className="lh-btn-wf">Explore Workflows →</button>
        </div>

        {/* Workflow Builder Mockup */}
        <div className="lh-wfb-card">
          <div className="lh-wfb-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="lh-wfb-name">Welcome Sequence</span>
              <div className="lh-wfb-status">
                <div className="lh-wfb-dot"></div> Active
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>100%</span>
              <button className="lh-wfb-save">Save Workflow</button>
            </div>
          </div>
          <div className="lh-wfb-canvas">
            <div className="lh-wfb-flow">
              {/* Trigger */}
              <div className="lh-wfb-node">
                <div className="lh-wfb-node-box trigger">⚡</div>
                <div className="lh-wfb-node-label">Trigger<br />Campaign Sent</div>
              </div>
              <div className="lh-wfb-arrow">→</div>
              {/* Wait */}
              <div className="lh-wfb-node">
                <div className="lh-wfb-node-box wait-node">⏳</div>
                <div className="lh-wfb-node-label">Wait<br />2 Days</div>
              </div>
              <div className="lh-wfb-arrow">→</div>
              {/* If/Else */}
              <div className="lh-wfb-node">
                <div className="lh-wfb-node-box condition">⟨⟩</div>
                <div className="lh-wfb-node-label">If / Else<br />Opened?</div>
              </div>
              <div className="lh-wfb-arrow">→</div>
              {/* Branches */}
              <div className="lh-wfb-branch">
                <div className="lh-wfb-branch-node">
                  <span className="lh-branch-label yes">Yes</span>
                  <div className="lh-wfb-arrow" style={{ margin: "0 4px" }}>→</div>
                  <div className="lh-branch-box yes-send">✉ Send Email<br /><span style={{ fontSize: 9 }}>Follow-up 1</span></div>
                  <div className="lh-wfb-arrow" style={{ margin: "0 4px" }}>→</div>
                  <div className="lh-wfb-node-box wait-node" style={{ width: 42, height: 42, fontSize: 16 }}>⏳</div>
                  <div style={{ fontSize: 9, color: "#6b7280", marginLeft: 4 }}>Wait<br />1 Day</div>
                </div>
                <div className="lh-wfb-branch-line"></div>
                <div className="lh-wfb-branch-node">
                  <span className="lh-branch-label no">No</span>
                  <div className="lh-wfb-arrow" style={{ margin: "0 4px" }}>→</div>
                  <div className="lh-branch-box no-remind">✉ Send Email<br /><span style={{ fontSize: 9 }}>Reminder</span></div>
                  <div className="lh-wfb-arrow" style={{ margin: "0 4px" }}>→</div>
                  <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "6px 10px", fontSize: 10, fontWeight: 600, color: "#374151" }}>🏷 Update Tag<br /><span style={{ fontSize: 9, color: "#9ca3af" }}>Not Opened</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="lh-how">
        <div className="lh-how-badge">HOW IT WORKS</div>
        <div className="lh-how-steps">
          {[
            { icon: "✉", title: "1. Import Leads", desc: "Upload CSV or add contacts manually" },
            { icon: "✔", title: "2. Validate Emails", desc: "Remove bad emails and risky addresses" },
            { icon: "🚀", title: "3. Launch Campaign", desc: "Send instantly or schedule for later" },
            { icon: "👁", title: "4. Track Engagement", desc: "See opens, clicks and replies in real-time" },
            { icon: "⚡", title: "5. Trigger Follow-ups", desc: "Enroll contacts into workflows automatically" },
            { icon: "📅", title: "6. Book Meetings", desc: "Turn engagement into conversations" },
          ].map((s) => (
            <div key={s.title} className="lh-how-step">
              <div className="lh-how-step-icon">{s.icon}</div>
              <div className="lh-how-step-title">{s.title}</div>
              <div className="lh-how-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── INTEGRATIONS ─── */}
      <section className="lh-integrations">
        <div className="lh-int-label">Seamless Integrations</div>
        <div className="lh-int-logos">
          {[
            { icon: "🔵", name: "Gmail" },
            { icon: "🟢", name: "Google Workspace" },
            { icon: "🟠", name: "HubSpot" },
            { icon: "☁", name: "Salesforce" },
            { icon: "🔷", name: "Pipedrive" },
            { icon: "💬", name: "Slack" },
            { icon: "⚡", name: "Zapier" },
          ].map((i) => (
            <div key={i.name} className="lh-int-logo">
              <span className="lh-int-logo-icon">{i.icon}</span>
              {i.name}
            </div>
          ))}
          <div className="lh-int-more">+ More</div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="lh-cta-section">
        <img src={gmailFooterImage} alt="Secure Gmail reach" className="lh-cta-bg-img" />
        <span className="lh-cta-email-icon">✉</span>
        <h2 className="lh-cta-title">Ready to turn outreach into pipeline?</h2>
        <p className="lh-cta-desc">
          Join thousands of GTM teams using GTM Reach to drive engagement and close more deals.
        </p>
        <div className="lh-cta-buttons">
          <button className="lh-btn-hero-primary">Start for free →</button>
          <button className="lh-btn-hero-outline">Book a demo</button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lh-footer">
        <div className="lh-footer-top">
          <div className="lh-footer-brand">
            <a href="#" className="lh-footer-logo">
              <div className="lh-nav-logo-icon">✉</div>
              GTM Reach
            </a>
            <p className="lh-footer-tagline">
              The all-in-one email intelligence platform for modern GTM teams.
            </p>
            <div className="lh-footer-socials">
              <a href="#" className="lh-footer-social">in</a>
              <a href="#" className="lh-footer-social">𝕏</a>
              <a href="#" className="lh-footer-social">▶</a>
            </div>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
            { title: "Solutions", links: ["Sales Teams", "Agencies", "Recruiting", "Startups"] },
            { title: "Resources", links: ["Blog", "Guides", "Templates", "Help Center"] },
            { title: "Company", links: ["About us", "Careers", "Contact us", "Privacy Policy"] },
          ].map((col) => (
            <div key={col.title} className="lh-footer-col">
              <div className="lh-footer-col-title">{col.title}</div>
              <ul>
                {col.links.map((link) => (
                  <li key={link}><a href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lh-footer-newsletter lh-footer-col">
            <div className="lh-footer-col-title">Newsletter</div>
            <p>Get email marketing tips and product updates.</p>
            <div className="lh-newsletter-input">
              <input type="email" placeholder="Enter your email" />
              <button>→</button>
            </div>
          </div>
        </div>
        <div className="lh-footer-bottom">
          © 2024 GTM Reach. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
