<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  export let atrdContent: any = null;
  
  let categories = {
    functional: { enabled: false, icon: '⚡', color: '#3b82f6', count: 0, completed: 0 },
    performance: { enabled: false, icon: '⚡', color: '#f59e0b', count: 0, completed: 0 },
    security: { enabled: false, icon: '🛡️', color: '#ef4444', count: 0, completed: 0 },
    accessibility: { enabled: false, icon: '♿', color: '#10b981', count: 0, completed: 0 },
    visual: { enabled: false, icon: '👁️', color: '#8b5cf6', count: 0, completed: 0 },
    dataQuality: { enabled: false, icon: '📊', color: '#06b6d4', count: 0, completed: 0 }
  };
  
  $: if (atrdContent?.testCategories) {
    updateCategories();
  }
  
  function updateCategories() {
    if (atrdContent?.testCategories) {
      categories.functional.enabled = atrdContent.testCategories.functional?.enabled || false;
      categories.performance.enabled = atrdContent.testCategories.performance?.enabled || false;
      categories.security.enabled = atrdContent.testCategories.security?.enabled || false;
      categories.accessibility.enabled = atrdContent.testCategories.accessibility?.enabled || false;
      categories.visual.enabled = atrdContent.testCategories.visual?.enabled || false;
      categories.dataQuality.enabled = atrdContent.testCategories.dataQuality?.enabled || false;
    }
  }
  
  function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
      functional: '🤖',
      performance: '⚡',
      security: '🛡️',
      accessibility: '♿',
      visual: '👁️',
      dataQuality: '📊'
    };
    return icons[category] || '📋';
  }
  
  function getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      functional: 'Web, mobile, desktop, API, ERP automation',
      performance: 'Load, stress, APM, SaaS labs',
      security: 'DAST, SAST, secrets, SBOM',
      accessibility: 'WCAG, screen readers, compliance',
      visual: 'Visual diff, UI comparison, screenshots',
      dataQuality: 'Data/ETL pipelines, data quality, migration'
    };
    return descriptions[category] || '';
  }
</script>

<div class="categories-dashboard">
  <h3>🧪 Test Categories</h3>
  <div class="categories-grid">
    {#each Object.entries(categories) as [key, category]}
      <div class="category-card" class:enabled={category.enabled} style="border-left-color: {category.color}">
        <div class="category-header">
          <span class="category-icon">{category.icon}</span>
          <span class="category-name">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
          <span class="category-badge" class:enabled={category.enabled}>
            {category.enabled ? '✅ Enabled' : '❌ Disabled'}
          </span>
        </div>
        <div class="category-description">
          {getCategoryDescription(key)}
        </div>
        {#if category.enabled}
          <div class="category-stats">
            <div class="stat">
              <span class="stat-label">Test Cases</span>
              <span class="stat-value">{category.count}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Completed</span>
              <span class="stat-value">{category.completed}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {category.count ? (category.completed / category.count) * 100 : 0}%"></div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .categories-dashboard {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .categories-dashboard h3 {
    margin: 0 0 1rem 0;
    color: #1f2937;
  }
  
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }
  
  .category-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-left-width: 4px;
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.2s;
  }
  
  .category-card.enabled {
    background: #f0fdf4;
    border-color: #d1fae5;
  }
  
  .category-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  
  .category-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  
  .category-icon {
    font-size: 1.25rem;
  }
  
  .category-name {
    font-weight: 600;
    color: #1f2937;
    flex: 1;
  }
  
  .category-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: #f3f4f6;
    color: #4b5563;
  }
  
  .category-badge.enabled {
    background: #d1fae5;
    color: #065f46;
  }
  
  .category-description {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }
  
  .category-stats {
    margin-top: 0.75rem;
  }
  
  .stat {
    display: inline-block;
    margin-right: 1rem;
  }
  
  .stat-label {
    font-size: 0.7rem;
    color: #6b7280;
  }
  
  .stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin-left: 0.25rem;
  }
  
  .progress-bar {
    margin-top: 0.5rem;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #10b981;
    border-radius: 2px;
    transition: width 0.3s;
  }
</style>
