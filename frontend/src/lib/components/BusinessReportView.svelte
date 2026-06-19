<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  let reports: any[] = [];
  let loading = true;
  let error = '';
  let selectedReport: any = null;
  
  onMount(async () => {
    await loadReports();
  });
  
  async function loadReports() {
    try {
      loading = true;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/api/business-reports', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load reports (${response.status})`);
      }
      
      const data = await response.json();
      reports = data.reports || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading reports:', err);
    } finally {
      loading = false;
    }
  }
  
  async function generateReport() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/api/business-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate report (${response.status})`);
      }
      
      const result = await response.json();
      if (result.success) {
        await loadReports();
      }
    } catch (err: any) {
      error = err.message;
    }
  }
  
  function viewReport(report: any) {
    selectedReport = report;
  }
  
  function closeReport() {
    selectedReport = null;
  }
  
  function downloadReport(report: any) {
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `business_report_${report.id || Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
</script>

<div class="business-reports">
  <div class="reports-header">
    <h3>📊 Business Reports</h3>
    <button class="generate-btn" on:click={generateReport}>
      + Generate New Report
    </button>
  </div>
  
  {#if loading}
    <div class="loading">Loading reports...</div>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else if selectedReport}
    <div class="report-detail">
      <div class="detail-header">
        <button class="back-btn" on:click={closeReport}>← Back to Reports</button>
        <button class="download-btn" on:click={() => downloadReport(selectedReport)}>📥 Download</button>
      </div>
      
      <div class="report-content">
        <h2>{selectedReport.title || 'Business Report'}</h2>
        <p class="date">Generated: {new Date(selectedReport.created_at).toLocaleString()}</p>
        
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-label">Total Tests</div>
            <div class="stat-value">{selectedReport.total_tests || 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Pass Rate</div>
            <div class="stat-value">{selectedReport.pass_rate || 0}%</div>
          </div>
          <div class="stat">
            <div class="stat-label">Critical Issues</div>
            <div class="stat-value critical">{selectedReport.critical_issues || 0}</div>
          </div>
        </div>
        
        <div class="report-section">
          <h3>Executive Summary</h3>
          <p>{selectedReport.executive_summary || 'No summary available'}</p>
        </div>
        
        <div class="report-section">
          <h3>Key Metrics</h3>
          <pre class="metrics">{JSON.stringify(selectedReport.metrics, null, 2)}</pre>
        </div>
      </div>
    </div>
  {:else if reports.length === 0}
    <div class="empty-state">
      <p>No reports available. Generate your first report!</p>
      <button class="primary-btn" on:click={generateReport}>Generate Report</button>
    </div>
  {:else}
    <div class="reports-list">
      {#each reports as report}
        <div role="button" tabindex="0" class="report-card" on:click={() => viewReport(report)} on:keydown={(event) => event.key === 'Enter' && viewReport(report)}>
          <div class="report-icon">📊</div>
          <div class="report-info">
            <h4>{report.title || `Report ${new Date(report.created_at).toLocaleDateString()}`}</h4>
            <p class="report-meta">Generated: {new Date(report.created_at).toLocaleString()}</p>
            <div class="report-stats">
              <span>✅ Pass: {report.pass_rate || 0}%</span>
              <span>🧪 Tests: {report.total_tests || 0}</span>
            </div>
          </div>
          <button type="button" class="download-icon" aria-label="Download report" on:click|stopPropagation={() => downloadReport(report)}>📥</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .business-reports {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .reports-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .reports-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #1f2937;
  }
  
  .generate-btn {
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .generate-btn:hover {
    background: #059669;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }
  
  .error-message {
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.375rem;
  }
  
  .reports-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .report-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .report-card:hover {
    transform: translateX(4px);
    border-color: #667eea;
    background: #f3f4f6;
  }
  
  .report-icon {
    font-size: 2rem;
  }
  
  .report-info {
    flex: 1;
  }
  
  .report-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    color: #1f2937;
  }
  
  .report-meta {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  
  .report-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #10b981;
  }
  
  .download-icon {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
  }
  
  .download-icon:hover {
    transform: scale(1.1);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
  
  .primary-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  /* Report Detail Styles */
  .report-detail {
    margin-top: 1rem;
  }
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .back-btn {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  .download-btn {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  .report-content h2 {
    margin: 0 0 0.25rem 0;
    color: #1f2937;
  }
  
  .report-content .date {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
  }
  
  .stat-value.critical {
    color: #ef4444;
  }
  
  .report-section {
    margin-bottom: 1.5rem;
  }
  
  .report-section h3 {
    font-size: 1rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  
  .metrics {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    font-size: 0.75rem;
    font-family: monospace;
  }
</style>
