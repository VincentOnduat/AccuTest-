import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request, cookies }) {
  try {
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { 
        cookies: { 
          get: (key) => cookies.get(key)
        } 
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { execution_id, format = 'html' } = await request.json();
    
    // Fetch execution data
    const { data: execution, error: execError } = await supabase
      .from('test_executions')
      .select('*, test_packages(*)')
      .eq('id', execution_id)
      .eq('user_id', user.id)
      .single();
    
    if (execError || !execution) {
      return json({ error: 'Execution not found' }, { status: 404 });
    }
    
    // Generate HTML report
    const html = generateHTMLReport(execution);
    
    if (format === 'html') {
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="test-report-${execution_id}.html"`
        }
      });
    }
    
    // For PDF, you'd use puppeteer to convert HTML to PDF
    // This requires additional setup
    
    return json({ success: true, html });
    
  } catch (error) {
    console.error('Report generation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateHTMLReport(execution: any): string {
  const passedTests = execution.test_results?.filter((t: any) => t.status === 'passed').length || 0;
  const failedTests = execution.test_results?.filter((t: any) => t.status === 'failed').length || 0;
  const passRate = execution.test_results?.length ? (passedTests / execution.test_results.length) * 100 : 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${execution.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      padding: 2rem;
      background: #f9fafb;
    }
    .summary-card {
      text-align: center;
      padding: 1rem;
    }
    .summary-value {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .summary-label {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .results {
      padding: 2rem;
    }
    .results h2 {
      margin-bottom: 1rem;
      color: #1f2937;
    }
    .test-item {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-status {
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .test-status.passed { background: #d1fae5; color: #065f46; }
    .test-status.failed { background: #fee2e2; color: #991b1b; }
    .footer {
      padding: 1.5rem;
      text-align: center;
      background: #f9fafb;
      color: #6b7280;
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Test Execution Report</h1>
      <p>${execution.name}</p>
      <p>Executed: ${new Date(execution.executed_at).toLocaleString()}</p>
      <p>Environment: ${execution.environment || 'staging'}</p>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="summary-value">${execution.test_results?.length || 0}</div>
        <div class="summary-label">Total Tests</div>
      </div>
      <div class="summary-card">
        <div class="summary-value passed">${passedTests}</div>
        <div class="summary-label">Passed</div>
      </div>
      <div class="summary-card">
        <div class="summary-value failed">${failedTests}</div>
        <div class="summary-label">Failed</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${passRate.toFixed(1)}%</div>
        <div class="summary-label">Pass Rate</div>
      </div>
    </div>
    
    <div class="results">
      <h2>Test Results</h2>
      ${execution.test_results?.map((test: any) => `
        <div class="test-item">
          <span>${test.name}</span>
          <span class="test-status ${test.status}">${test.status.toUpperCase()}</span>
        </div>
        ${test.error_message ? `<div style="padding: 0 1rem 1rem 1rem; color: #dc2626; font-size: 0.875rem;">❌ ${test.error_message}</div>` : ''}
      `).join('') || '<p>No test results available</p>'}
    </div>
    
    <div class="footer">
      <p>Generated by Aether Automate • ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `;
}
