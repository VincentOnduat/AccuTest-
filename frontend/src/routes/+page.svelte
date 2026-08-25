<script lang="ts">
  const domains = [
    { icon: '⚙️', name: 'Functional' },
    { icon: '⚡', name: 'Performance' },
    { icon: '🔒', name: 'Security' },
    { icon: '♿', name: 'Accessibility' },
    { icon: '🖼️', name: 'Visual' },
    { icon: '🗃️', name: 'Data / ETL' }
  ];

  const steps = [
    {
      title: 'Upload your requirements',
      body: 'Drop in an ATRD (Automation Test Requirement Document) — plain requirements, no special format needed.'
    },
    {
      title: 'Generates real test code',
      body: 'GPT parses the document and writes executable Playwright, Cypress, Jest, or k6 code across six test domains.'
    },
    {
      title: 'Run it and see real results',
      body: 'Execute the generated Playwright tests against your app and get real pass/fail results — not a simulation.'
    }
  ];
</script>

<svelte:head>
  <title>AccuTest — Precision Test Automation</title>
  <meta
    name="description"
    content="Turn requirement documents into executable test code, then actually run it. AccuTest parses ATRDs, generates Playwright/Cypress/Jest/k6 tests, and executes them for real results."
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
      <h1>Requirements in. Real tests running out.</h1>
      <p class="lead">
        AccuTest turns your requirement documents into executable test code across six
        domains — then actually runs it, so you get real pass/fail results instead of a
        pile of untested scripts.
      </p>
      <div class="hero-actions">
        <a href="/signup" class="btn-primary">Get Started Free</a>
        <a href="/login" class="btn-secondary">Sign In</a>
      </div>
    </div>
  </section>

  <section class="domains">
    <h2>Six test domains, one workflow</h2>
    <div class="domain-grid">
      {#each domains as d}
        <div class="domain-card">
          <span class="domain-icon">{d.icon}</span>
          <span>{d.name}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="steps">
    <h2>How it works</h2>
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
    <h2>Everything you need to track it</h2>
    <div class="feature-grid">
      <div class="feature">
        <h3>📊 Dashboard analytics</h3>
        <p>Real-time stats across sessions, packages, and tasks.</p>
      </div>
      <div class="feature">
        <h3>🔄 Test sessions</h3>
        <p>Group and manage runs across your test suites.</p>
      </div>
      <div class="feature">
        <h3>✅ Task management</h3>
        <p>Track follow-up work with priority levels, tied back to source requirements.</p>
      </div>
      <div class="feature">
        <h3>▶️ Real execution</h3>
        <p>Generated Playwright tests run for real against a target URL you configure — actual pass/fail, not a coin flip.</p>
      </div>
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
