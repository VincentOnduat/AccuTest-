import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error_message?: string;
}

export async function POST({ request, cookies }) {
  try {
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { 
        cookies: { 
          get: (key) => cookies.get(key),
          set: (key, value, options) => cookies.set(key, value, options),
          remove: (key, options) => cookies.delete(key, options)
        } 
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { package_id, environment = 'staging' } = await request.json();
    
    // Fetch the test package
    const { data: pkg, error: pkgError } = await supabase
      .from('test_packages')
      .select('*')
      .eq('id', package_id)
      .eq('user_id', user.id)
      .single();
    
    if (pkgError || !pkg) {
      return json({ error: 'Test package not found' }, { status: 404 });
    }
    
    const testCases = pkg.test_cases?.testCases || [];
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    // Simulate running tests (replace with actual Playwright execution)
    for (const testCase of testCases) {
      const testStart = Date.now();
      
      // Simulate test execution (in real implementation, this would call Playwright)
      // This is where you'd integrate with actual test framework
      const passed = Math.random() > 0.2; // 80% pass rate simulation
      
      results.push({
        name: testCase.name,
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - testStart,
        error_message: passed ? undefined : 'Test failed: Expected condition not met'
      });
    }
    
    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const status = failedCount === 0 ? 'passed' : 'failed';
    
    // Save execution results
    const { data: execution, error: execError } = await supabase
      .from('test_executions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        name: `${pkg.name} - ${new Date().toLocaleString()}`,
        suite_name: pkg.name,
        status: status,
        duration: totalDuration,
        environment: environment,
        test_results: results,
        executed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (execError) {
      return json({ error: execError.message }, { status: 500 });
    }
    
    return json({
      success: true,
      execution_id: execution.id,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: failedCount,
        duration: totalDuration,
        passRate: (passedCount / results.length) * 100
      },
      results
    });
    
  } catch (error) {
    console.error('Test runner error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
