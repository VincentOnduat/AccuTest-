<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';

  // Auth fetch helper — attaches the Bearer token, mirroring the pattern used
  // on the main dashboard and ATRD list pages. Plain fetch() with only
  // credentials:'include' never authenticates here because nothing syncs the
  // Supabase session into server cookies.
  async function authFetch(url: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  }

  let atrd: any = null;
  let loading = true;
  let error = '';
  let showRawJson = false;
  let isEditing = false;
  let editName = '';
  let editContent: any = null;
  let saving = false;
  let testPackages: any[] = [];
  let showTestPackages = false;
  // Pre-filled from whatever URL the ATRD parser found in the document
  // (see atrdParser.ts's detectUrls) — editable before generating, and left
  // blank falls back to the account's default Target Application URL.
  let targetUrl = '';

  $: id = $page.params.id;

  onMount(async () => {
    await loadATRD();
    await loadTestPackages();
  });

  async function loadATRD() {
    loading = true;
    error = '';

    try {
      const response = await authFetch(`/api/atrd/${id}`);

      if (response.ok) {
        atrd = await response.json();
        editName = atrd.name;
        editContent = JSON.parse(JSON.stringify(atrd.content));
        targetUrl = atrd.content?.metadata?.detectedUrl || '';
        console.log('Loaded ATRD:', atrd);
      } else if (response.status === 404) {
        error = 'ATRD not found';
      } else {
        error = 'Failed to load ATRD';
      }
    } catch (err) {
      console.error('Error loading ATRD:', err);
      error = 'Network error';
    } finally {
      loading = false;
    }
  }
  
  async function loadTestPackages() {
    try {
      const response = await authFetch(`/api/packages?atrd_id=${id}`);
      if (response.ok) {
        const result = await response.json();
        testPackages = result.data || [];
      }
    } catch (err) {
      console.error('Error loading test packages:', err);
    }
  }
  
  async function saveEdit() {
    saving = true;
    
    try {
      const response = await authFetch(`/api/atrd/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          content: editContent,
          domain: atrd.domain
        })
      });
      
      if (response.ok) {
        atrd.name = editName;
        atrd.content = editContent;
        isEditing = false;
        alert('ATRD updated successfully!');
      } else {
        const error = await response.json();
        alert('Failed to update: ' + error.error);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving changes');
    } finally {
      saving = false;
    }
  }
  
  async function generateTestPackage() {
    if (!atrd) return;

    try {
      const response = await authFetch('/api/ai/generate-test-package', {
        method: 'POST',
        body: JSON.stringify({
          atrdId: atrd.id,
          document: JSON.stringify(atrd.content),
          testDomain: atrd.domain,
          name: `${atrd.name} - Test Package`,
          targetUrl: targetUrl.trim() || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Test package generated! ID: ${result.id}`);
        await loadTestPackages();
        showTestPackages = true;
      } else {
        const result = await response.json().catch(() => null);
        alert(result?.error || 'Failed to generate test package');
      }
    } catch (err) {
      console.error('Generation error:', err);
      alert('Error generating test package');
    }
  }
  
  async function deleteATRD() {
    if (!confirm('Delete this ATRD? This will also delete all associated test packages.')) return;
    
    try {
      const response = await authFetch(`/api/atrd/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        goto('/dashboard/atrd');
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting');
    }
  }
  
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }
  
  function exportAsJSON() {
    const data = {
      name: atrd.name,
      exportedAt: new Date().toISOString(),
      content: atrd.content,
      metadata: {
        domain: atrd.domain,
        created: atrd.created_at,
        updated: atrd.updated_at
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atrd.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function exportAsMarkdown() {
    let markdown = `# ${atrd.name}\n\n`;
    markdown += `**Domain:** ${atrd.domain || 'General'}\n`;
    markdown += `**Created:** ${formatDate(atrd.created_at)}\n`;
    markdown += `**Updated:** ${formatDate(atrd.updated_at)}\n\n`;
    
    if (atrd.content?.metadata) {
      markdown += `## Metadata\n\n`;
      markdown += `- **Project:** ${atrd.content.metadata.projectName || 'N/A'}\n`;
      markdown += `- **Version:** ${atrd.content.metadata.version || 'N/A'}\n`;
      markdown += `- **Description:** ${atrd.content.metadata.description || 'N/A'}\n\n`;
    }
    
    if (atrd.content?.objectives?.primary) {
      markdown += `## Primary Objective\n\n${atrd.content.objectives.primary}\n\n`;
    }
    
    if (atrd.content?.scope) {
      markdown += `## Scope\n\n`;
      markdown += `### In Scope\n`;
      atrd.content.scope.inScope?.forEach((item: string) => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n### Out of Scope\n`;
      atrd.content.scope.outOfScope?.forEach((item: string) => {
        markdown += `- ${item}\n`;
      });
      markdown += `\n`;
    }
    
    if (atrd.content?.functionalAreas) {
      markdown += `## Functional Areas\n\n`;
      atrd.content.functionalAreas.forEach((area: any) => {
        markdown += `### ${area.name} (${area.priority} Priority)\n`;
        area.scenarios?.forEach((scenario: string) => {
          markdown += `- ${scenario}\n`;
        });
        markdown += `\n`;
      });
    }
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atrd.name.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function exportAsCSV() {
    const rows = [['Category', 'Item', 'Priority', 'Details']];
    
    if (atrd.content?.functionalAreas) {
      atrd.content.functionalAreas.forEach((area: any) => {
        area.scenarios?.forEach((scenario: string) => {
          rows.push(['Functional Area', area.name, area.priority, scenario]);
        });
      });
    }
    
    if (atrd.content?.criticalWorkflows) {
      atrd.content.criticalWorkflows.forEach((workflow: any) => {
        rows.push(['Critical Workflow', workflow.name, workflow.priority, workflow.steps?.join('; ')]);
      });
    }
    
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atrd.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function renderValue(key: string, value: any, depth: number = 0): string {
    if (value === null) return '<span class="null">null</span>';
    if (typeof value === 'boolean') return `<span class="boolean">${value}</span>`;
    if (typeof value === 'number') return `<span class="number">${value}</span>`;
    if (typeof value === 'string') return `<span class="string">"${value}"</span>`;
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="array">[]</span>';
      const items = value.map(item => renderValue('', item, depth + 1)).join(', ');
      return `<span class="array">[${items}]</span>`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return '<span class="object">{}</span>';
      const props = entries.map(([k, v]) => {
        const rendered = renderValue(k, v, depth + 1);
        return `<div class="json-prop" style="margin-left: ${depth * 20}px"><span class="json-key">"${k}"</span>: ${rendered}</div>`;
      }).join('');
      return `<div class="json-object">{${props}}</div>`;
    }
    return String(value);
  }
</script>

<svelte:head>
  <title>{atrd?.name || 'ATRD Details'} - Aether Automate</title>
</svelte:head>

<div class="container">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading ATRD...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error</h2>
      <p>{error}</p>
      <button class="btn-primary" on:click={() => goto('/dashboard/atrd')}>
        ← Back to ATRDs
      </button>
    </div>
  {:else if atrd}
    <div class="header">
      <div>
        <button class="btn-back" on:click={() => goto('/dashboard/atrd')}>
          ← Back to ATRDs
        </button>
        {#if isEditing}
          <input type="text" bind:value={editName} class="edit-name-input" />
        {:else}
          <h1>{atrd.name}</h1>
        {/if}
        <div class="meta">
          <span class="badge">🏷️ Domain: {atrd.domain || 'General'}</span>
          <span class="badge">📅 Created: {formatDate(atrd.created_at)}</span>
          {#if atrd.updated_at !== atrd.created_at}
            <span class="badge">✏️ Updated: {formatDate(atrd.updated_at)}</span>
          {/if}
        </div>
        <div class="target-url-field">
          <label for="atrd-target-url">
            🌐 Website to test
            {#if atrd.content?.metadata?.detectedUrl}
              <span class="detected-note">— found in this document</span>
            {/if}
          </label>
          <input
            id="atrd-target-url"
            type="url"
            bind:value={targetUrl}
            placeholder="https://your-app.example.com (defaults to Settings if blank)"
          />
        </div>
      </div>
      <div class="actions">
        {#if isEditing}
          <button class="btn-save" on:click={saveEdit} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
          <button class="btn-secondary" on:click={() => { isEditing = false; editName = atrd.name; editContent = JSON.parse(JSON.stringify(atrd.content)); }}>
            Cancel
          </button>
        {:else}
          <button class="btn-edit" on:click={() => isEditing = true}>
            ✏️ Edit
          </button>
        {/if}
        <button class="btn-generate" on:click={generateTestPackage}>
          🎯 Generate Tests
        </button>
        <div class="export-dropdown">
          <button class="btn-export">📥 Export ▼</button>
          <div class="dropdown-content">
            <button on:click={exportAsJSON}>JSON</button>
            <button on:click={exportAsMarkdown}>Markdown</button>
            <button on:click={exportAsCSV}>CSV</button>
          </div>
        </div>
        <button class="btn-danger" on:click={deleteATRD}>
          🗑️ Delete
        </button>
      </div>
    </div>
    
    <!-- Test Packages Section -->
    {#if testPackages.length > 0 || showTestPackages}
      <div class="test-packages-section">
        <div class="section-header">
          <h2>📦 Generated Test Packages</h2>
          <button class="btn-small" on:click={() => showTestPackages = !showTestPackages}>
            {showTestPackages ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {#if showTestPackages && testPackages.length > 0}
          <div class="test-packages-list">
            {#each testPackages as pkg}
              <div class="test-package-card">
                <div class="package-header">
                  <strong>{pkg.name}</strong>
                  <span class="status-badge {pkg.status}">{pkg.status}</span>
                </div>
                <div class="package-meta">
                  <span>📅 {new Date(pkg.created_at).toLocaleDateString()}</span>
                  <span>🧪 {pkg.test_cases?.length || 0} test cases</span>
                </div>
                <button class="btn-view-small" on:click={() => goto(`/dashboard/packages/${pkg.id}`)}>
                  View Details
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    
    <div class="content">
      {#if showRawJson}
        <div class="json-viewer">
          <h3>Raw JSON</h3>
          <pre>{JSON.stringify(atrd.content, null, 2)}</pre>
        </div>
      {:else}
        {#if isEditing}
          <div class="edit-mode">
            <textarea 
              bind:value={editContent} 
              rows={20}
              class="edit-textarea"
            ></textarea>
            <p class="edit-hint">💡 Edit JSON content directly. Be careful to maintain valid JSON structure.</p>
          </div>
        {:else}
          <!-- Metadata Section -->
          {#if atrd.content?.metadata}
            <section class="section">
              <h2>📋 Metadata</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Project Name:</span>
                  <span class="value">{atrd.content.metadata.projectName || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="label">Domain:</span>
                  <span class="value">{atrd.content.metadata.domain || atrd.domain || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="label">Version:</span>
                  <span class="value">{atrd.content.metadata.version || 'N/A'}</span>
                </div>
                <div class="info-item full-width">
                  <span class="label">Description:</span>
                  <span class="value">{atrd.content.metadata.description || 'N/A'}</span>
                </div>
              </div>
            </section>
          {/if}
          
          <!-- Scope Section -->
          {#if atrd.content?.scope}
            <section class="section">
              <h2>📐 Scope</h2>
              <div class="two-columns">
                <div class="scope-column">
                  <h4>✅ In Scope</h4>
                  <ul>
                    {#each atrd.content.scope.inScope || [] as item}
                      <li>{item}</li>
                    {/each}
                  </ul>
                </div>
                <div class="scope-column">
                  <h4>❌ Out of Scope</h4>
                  <ul>
                    {#each atrd.content.scope.outOfScope || [] as item}
                      <li>{item}</li>
                    {/each}
                  </ul>
                </div>
              </div>
            </section>
          {/if}
          
          <!-- Functional Areas -->
          {#if atrd.content?.functionalAreas?.length}
            <section class="section">
              <h2>🔧 Functional Areas</h2>
              <div class="areas-grid">
                {#each atrd.content.functionalAreas as area}
                  <div class="area-card">
                    <h3>{area.name}</h3>
                    <span class="priority {area.priority?.toLowerCase()}">{area.priority || 'Medium'}</span>
                    {#if area.scenarios?.length}
                      <ul>
                        {#each area.scenarios as scenario}
                          <li>{scenario}</li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                {/each}
              </div>
            </section>
          {/if}
          
          <!-- Critical Workflows -->
          {#if atrd.content?.criticalWorkflows?.length}
            <section class="section">
              <h2>🔄 Critical Workflows</h2>
              {#each atrd.content.criticalWorkflows as workflow}
                <div class="workflow-card">
                  <h3>{workflow.name}</h3>
                  <span class="priority {workflow.priority?.toLowerCase()}">{workflow.priority}</span>
                  <div class="workflow-steps">
                    <strong>Steps:</strong>
                    <ol>
                      {#each workflow.steps || [] as step}
                        <li>{step}</li>
                      {/each}
                    </ol>
                  </div>
                </div>
              {/each}
            </section>
          {/if}
          
          <!-- Success Criteria -->
          {#if atrd.content?.successCriteria?.length}
            <section class="section">
              <h2>✅ Success Criteria</h2>
              <ul class="criteria-list">
                {#each atrd.content.successCriteria as criteria}
                  <li>{criteria}</li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .header h1 {
    margin: 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
  }
  
  .edit-name-input {
    font-size: 1.5rem;
    font-weight: bold;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    margin: 0.5rem 0;
    width: 100%;
  }
  
  .btn-back {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0;
  }
  
  .meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }
  
  .badge {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .target-url-field {
    margin-top: 0.75rem;
    max-width: 28rem;
  }

  .target-url-field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 0.25rem;
  }

  .detected-note {
    font-weight: 400;
    color: #059669;
  }

  .target-url-field input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .btn-primary, .btn-edit, .btn-generate, .btn-export, .btn-danger, .btn-save, .btn-secondary {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .btn-edit {
    background: #3b82f6;
    color: white;
  }
  
  .btn-generate {
    background: #10b981;
    color: white;
  }
  
  .btn-export {
    background: #6b7280;
    color: white;
  }
  
  .btn-danger {
    background: #ef4444;
    color: white;
  }
  
  .btn-save {
    background: #10b981;
    color: white;
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
  }
  
  .export-dropdown {
    position: relative;
    display: inline-block;
  }
  
  .dropdown-content {
    display: none;
    position: absolute;
    background-color: white;
    min-width: 120px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
    border-radius: 0.375rem;
    overflow: hidden;
  }
  
  .export-dropdown:hover .dropdown-content {
    display: block;
  }
  
  .dropdown-content button {
    width: 100%;
    padding: 0.5rem 1rem;
    border: none;
    background: white;
    text-align: left;
    cursor: pointer;
  }
  
  .dropdown-content button:hover {
    background: #f3f4f6;
  }
  
  .test-packages-section {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .test-packages-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .test-package-card {
    background: white;
    padding: 0.75rem;
    border-radius: 0.375rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
  }
  
  .status-badge.pending { background: #fef3c7; color: #92400e; }
  .status-badge.completed { background: #d1fae5; color: #065f46; }
  .status-badge.failed { background: #fee2e2; color: #991b1b; }
  
  .btn-view-small {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
  }
  
  .content {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    padding: 2rem;
  }
  
  .edit-mode {
    width: 100%;
  }
  
  .edit-textarea {
    width: 100%;
    font-family: monospace;
    padding: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .edit-hint {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }
  
  .section {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .section:last-child {
    border-bottom: none;
  }
  
  .section h2 {
    font-size: 1.25rem;
    color: #1f2937;
    margin-bottom: 1rem;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .info-item.full-width {
    grid-column: 1 / -1;
  }
  
  .info-item .label {
    font-size: 0.7rem;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
    display: block;
  }
  
  .info-item .value {
    font-size: 0.875rem;
    color: #1f2937;
  }
  
  .two-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  
  .scope-column h4 {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .scope-column ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .scope-column li {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.25rem;
  }
  
  .areas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .area-card, .workflow-card {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  .area-card h3, .workflow-card h3 {
    font-size: 1rem;
    margin: 0 0 0.5rem 0;
  }
  
  .priority {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .priority.critical, .priority.high {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .priority.medium {
    background: #fed7aa;
    color: #92400e;
  }
  
  .priority.low {
    background: #d1fae5;
    color: #065f46;
  }
  
  .area-card ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
  }
  
  .area-card li {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  
  .workflow-steps {
    margin-top: 0.75rem;
  }
  
  .workflow-steps ol {
    margin: 0.25rem 0 0 1.25rem;
  }
  
  .workflow-steps li {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.25rem;
  }
  
  .criteria-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .criteria-list li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
  }
  
  .criteria-list li::before {
    content: "✅";
    position: absolute;
    left: 0;
  }
  
  .json-viewer {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }
  
  .json-viewer pre {
    margin: 0;
    font-size: 0.75rem;
    overflow-x: auto;
  }
  
  .loading-state {
    text-align: center;
    padding: 4rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-state {
    text-align: center;
    padding: 3rem;
    background: #fef2f2;
    border-radius: 0.5rem;
    color: #dc2626;
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }
    
    .two-columns {
      grid-template-columns: 1fr;
    }
    
    .actions {
      width: 100%;
    }
  }
</style>
