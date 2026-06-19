<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let atrdContent = '';
  let parsing = false;
  let error = '';
  
  async function parseATRD() {
    if (!atrdContent.trim()) {
      error = 'Please enter ATRD content to parse';
      return;
    }
    
    parsing = true;
    error = '';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        error = 'Please refresh the page and try again';
        return;
      }
      
      const response = await fetch('/api/atrd/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: atrdContent })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to parse ATRD (${response.status})`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        dispatch('requirementParsed', result.data);
        atrdContent = ''; // Clear on success
      } else {
        error = result.error || 'Failed to parse ATRD';
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      parsing = false;
    }
  }
  
  function loadExample() {
    atrdContent = `# Test Requirements Document

## Feature: User Authentication

### Requirement: Login Functionality
**Priority:** Critical
**Description:** Users must be able to log in with valid credentials

**Test Cases:**
1. Valid login with correct email and password
2. Invalid login with wrong password shows error
3. Empty fields show validation messages
4. Password reset flow works

### Requirement: Session Management
**Priority:** High
**Description:** User session should be maintained securely

**Test Cases:**
1. Session persists after page refresh
2. Session expires after inactivity
3. Logout clears session data

## Feature: Dashboard

### Requirement: Data Display
**Priority:** Medium
**Description:** Dashboard shows user-specific data

**Test Cases:**
1. Dashboard loads within 2 seconds
2. Data matches logged-in user
3. Charts render correctly`;
  }
</script>

<div class="atrd-parser">
  <div class="parser-header">
    <h3>📄 Import ATRD Document</h3>
    <p class="subtitle">Paste your Automated Test Requirements Document (ATRD) to automatically generate test cases</p>
  </div>
  
  <div class="content-section">
    <div class="toolbar">
      <button class="example-btn" on:click={loadExample} type="button">
        📋 Load Example
      </button>
    </div>
    
    <textarea
      bind:value={atrdContent}
      placeholder="Paste your ATRD content here...
      
Example format:
## Feature: Feature Name
### Requirement: Requirement Name
**Priority:** Critical/High/Medium/Low
**Description:** Description here

**Test Cases:**
1. First test case
2. Second test case"
      rows="12"
      disabled={parsing}
    ></textarea>
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}
    
    <button 
      class="parse-btn" 
      on:click={parseATRD} 
      disabled={parsing || !atrdContent.trim()}
    >
      {#if parsing}
        <span class="spinner"></span>
        <span>Parsing...</span>
      {:else}
        <span>🚀 Parse ATRD & Generate Tests</span>
      {/if}
    </button>
  </div>
</div>

<style>
  .atrd-parser {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .parser-header {
    margin-bottom: 1.5rem;
  }
  
  .parser-header h3 {
    font-size: 1.25rem;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }
  
  .subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }
  
  .toolbar {
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: flex-end;
  }
  
  .example-btn {
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
  }
  
  .example-btn:hover {
    background: #e5e7eb;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: 'Monaco', 'Menlo', monospace;
    resize: vertical;
  }
  
  .error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.375rem;
  }
  
  .parse-btn {
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1rem;
  }
  
  .parse-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }
  
  .parse-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
