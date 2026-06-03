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
import gdprLogo from "../footer-logo/gdpr-ready-logo 2.svg";
import ccpaLogo from "../footer-logo/ccpa-1.png";
import iso9001Logo from "../footer-logo/ISO9001-2015.svg";
import iso27001Logo from "../footer-logo/ISO27001-2022.svg";
import horizontalLogo from "../assests/transparent-horizontal-removebg-preview.png";
import verticalLogo from "../assests/trans-vertical-blue-removebg-preview.png";
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
          <img src={horizontalLogo} alt="GTM Reach" className="lh-nav-logo-img" />
        </a>
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
            <div className="lh-feature-preview lh-feature-image-full">
              <img src={automationImage} alt="Workflow automation preview" className="lh-feature-asset" />
            </div>
          </div>

          {/* Card 3: Verify Email */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">03</div>
            <div className="lh-feature-title">Verify Every Email</div>
            <p className="lh-feature-desc">
              Bulk validate emails, check MX records, and protect your sender reputation.
            </p>
            <div className="lh-feature-preview lh-feature-image-full">
              <img src={validationImage} alt="Email validation preview" className="lh-feature-asset" />
            </div>
          </div>

          {/* Card 4: Track Engagement */}
          <div className="lh-feature-card">
            <div className="lh-feature-num">04</div>
            <div className="lh-feature-title">Track Real Engagement</div>
            <p className="lh-feature-desc">
              Per-recipient tracking pixels and link tracking for accurate opens & clicks.
            </p>
            <div className="lh-feature-preview lh-feature-image-full">
              <img src={openClickImage} alt="Engagement tracking preview" className="lh-feature-asset" />
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

        {/* Workflow Builder Preview */}
        <div className="lh-workflow-preview">
          <img src={automationImage} alt="Workflow automation preview" className="lh-workflow-image" />
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="lh-cta-section">
        <div className="lh-cta-card">
          <div className="lh-cta-copy">
            <span className="lh-cta-email-icon">✉</span>
            <h2 className="lh-cta-title">Ready to turn outreach into pipeline?</h2>
            <p className="lh-cta-desc">
              Join thousands of GTM teams using GTM Reach to drive engagement and close more deals.
            </p>
            <div className="lh-cta-buttons">
              <button className="lh-btn-hero-primary">Start for free →</button>
              <button className="lh-btn-hero-outline">Book a demo</button>
            </div>
          </div>
          <div className="lh-cta-image-wrap">
            <img src={gmailFooterImage} alt="Secure Gmail reach" className="lh-cta-bg-img" />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lh-footer">
        <div className="lh-footer-top">
          <div className="lh-footer-brand">
            <a href="#" className="lh-footer-logo">
              <img src={verticalLogo} alt="GTM Reach" className="lh-footer-logo-img" />
            </a>
            <p className="lh-footer-tagline">
              Empowering go-to-market teams with real-time email intelligence and predictive outreach.
            </p>
            <div className="lh-footer-socials">
              <a href="#" className="lh-footer-social">in</a>
            </div>
          </div>

          <div className="lh-footer-badges">
            <div className="lh-footer-badge">
              <img src={gdprLogo} alt="GDPR compliance badge" />
            </div>
            <div className="lh-footer-badge">
              <img src={ccpaLogo} alt="CCPA compliance badge" />
            </div>
            <div className="lh-footer-badge">
              <img src={iso9001Logo} alt="ISO 9001 badge" />
            </div>
            <div className="lh-footer-badge">
              <img src={iso27001Logo} alt="ISO 27001 badge" />
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
