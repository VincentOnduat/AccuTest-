<script lang="ts">
  const steps = [
    {
      title: 'Upload your requirements',
      body: 'Drop in an ATRD (Automation Test Requirement Document) — plain requirements, no special format needed.'
    },
    {
      title: 'Run it for real, repeatedly',
      body: 'GPT writes executable Playwright code, then AccuTest actually runs it against your site and keeps every result — not a one-off.'
    },
    {
      title: 'Watch the loop compound',
      body: 'Flaky tests surface automatically from that history, and the next generation for the same site is handed its known-reliable and known-flaky selectors — so it gets better, not just faster.'
    }
  ];

  const domains = [
    { icon: '⚙️', name: 'Functional' },
    { icon: '⚡', name: 'Performance' },
    { icon: '🔒', name: 'Security' },
    { icon: '♿', name: 'Accessibility' },
    { icon: '🖼️', name: 'Visual' },
    { icon: '🗃️', name: 'Data / ETL' }
  ];
</script>

<svelte:head>
  <title>AccuTest — Flaky Test Detection That Learns Your Site</title>
  <meta
    name="description"
    content="AccuTest generates real Playwright tests from your requirements, runs them for real, and remembers what it learns — flagging flaky tests automatically and feeding known-reliable selectors back into every new test it writes for your site."
  />
</svelte:head>

<div class="page">
  <header class="nav">
    <div class="nav-inner">
      <span class="brand">🎯 AccuTest</span>
      <div class="nav-links">
        <a href="/login">Sign In</a>
        <a href="/signup" class="cta-small">Get Started Free</a>
      </div>
    </div>
  </header>

  <section class="hero">
    <div class="hero-inner">
      <h1>Tests that get less flaky the more you run them.</h1>
      <p class="lead">
        A one-off chat with an AI can write you a test. It can't tell you which of your
        selectors have quietly started failing, or remember what actually held up last
        time. AccuTest runs your tests for real, tracks every result, and uses that
        history — not a fresh guess — every time it writes the next one.
      </p>
      <div class="hero-actions">
        <a href="/signup" class="btn-primary">Get Started Free</a>
        <a href="/login" class="btn-secondary">Sign In</a>
      </div>
    </div>
  </section>

  <section class="steps">
    <h2>How the loop works</h2>
    <div class="steps-grid">
      {#each steps as step, i}
        <div class="step-card">
          <div class="step-number">{i + 1}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="features">
    <h2>Built around execution history, not just generation</h2>
    <div class="feature-grid">
      <div class="feature">
        <h3>🔁 Flaky test detection</h3>
        <p>Every test's pass/fail record across its last 10 runs, surfaced automatically — a rolling flag, not a one-time guess, so a test that's settled down stops being flagged.</p>
      </div>
      <div class="feature">
        <h3>🧠 Selector memory</h3>
        <p>Locators are scored per site from real runs. The next generation for that site is told which have held up and which keep breaking — the one thing a stateless chat prompt can never know.</p>
      </div>
      <div class="feature">
        <h3>▶️ Real execution</h3>
        <p>Generated Playwright tests run for real against a target URL you configure — actual pass/fail, not a simulation.</p>
      </div>
      <div class="feature">
        <h3>📊 Dashboard analytics</h3>
        <p>Real-time stats across sessions, packages, and tasks, all tied back to the requirements they came from.</p>
      </div>
    </div>
  </section>

  <section class="domains">
    <h2>Also generates across six test domains</h2>
    <div class="domain-grid">
      {#each domains as d}
        <div class="domain-card">
          <span class="domain-icon">{d.icon}</span>
          <span>{d.name}</span>
        </div>
      {/each}
    </div>
  </section>

  <footer class="footer">
    <p>© {new Date().getFullYear()} AccuTest. All rights reserved.</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
  }
  .page {
    font-family: 'Inter', system-ui, sans-serif;
    color: #1f2937;
  }

  .nav {
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }
  .nav-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-weight: 800;
    font-size: 1.25rem;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }
  .nav-links a {
    color: #374151;
    text-decoration: none;
    font-weight: 500;
  }
  .cta-small {
    background: #667eea;
    color: white !important;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
  }

  .hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    padding: 5rem 1.5rem;
  }
  .hero-inner {
    max-width: 720px;
    margin: 0 auto;
  }
  .hero h1 {
    font-size: 2.75rem;
    line-height: 1.15;
    margin: 0 0 1.25rem 0;
  }
  .lead {
    font-size: 1.15rem;
    opacity: 0.92;
    margin: 0 0 2rem 0;
  }
  .hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn-primary,
  .btn-secondary {
    padding: 0.85rem 1.75rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    font-size: 1rem;
  }
  .btn-primary {
    background: white;
    color: #5a4fcf;
  }
  .btn-secondary {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  section h2 {
    text-align: center;
    font-size: 1.75rem;
    margin: 0 0 2.5rem 0;
  }

  .domains {
    max-width: 1100px;
    margin: 0 auto;
    padding: 4rem 1.5rem;
  }
  .domain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }
  .domain-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem 1rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }
  .domain-icon {
    font-size: 1.75rem;
  }

  .steps {
    background: #f9fafb;
    padding: 4rem 1.5rem;
  }
  .steps-grid {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 2rem;
  }
  .step-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.75rem;
  }
  .step-number {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    background: #667eea;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .step-card h3 {
    margin: 0 0 0.5rem 0;
  }
  .step-card p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .features {
    max-width: 1100px;
    margin: 0 auto;
    padding: 4rem 1.5rem;
  }
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
  }
  .feature h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.05rem;
  }
  .feature p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .footer {
    text-align: center;
    padding: 2.5rem 1.5rem;
    color: #9ca3af;
    font-size: 0.875rem;
    border-top: 1px solid #e5e7eb;
  }
</style>
