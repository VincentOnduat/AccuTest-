// src/routes/api/atrd/parse/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
  console.log('🔍 Parse endpoint called');
  
  try {
    // ✅ Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid Authorization header');
      return json({ success: false, error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token received, length:', token.length);
    
    // ✅ Create a Supabase client with the token
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
    
    // ✅ Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('❌ Token verification failed:', userError.message);
      return json({ success: false, error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    if (!user) {
      console.error('❌ No user found for token');
      return json({ success: false, error: 'Unauthorized - User not found' }, { status: 401 });
    }
    
    console.log('✅ Authenticated user:', user.email);
    
    // ✅ Parse the request body
    const body = await request.json();
    const { content } = body;
    
    if (!content) {
      return json({ success: false, error: 'No content provided' }, { status: 400 });
    }
    
    console.log('📝 Parsing ATRD content, length:', content.length);
    
    // ✅ Parse the ATRD content
    // This is a simple parser - you can enhance it based on your ATRD format
    const parsedData = parseATRDContent(content);
    
    console.log('✅ Parse successful, found sections:', parsedData.sections.length);
    
    return json({ 
      success: true, 
      data: parsedData 
    });
    
  } catch (error) {
    console.error('❌ Parse endpoint error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
};

// Helper function to parse ATRD content
function parseATRDContent(content: string) {
  const lines = content.split('\n');
  const sections: any[] = [];
  let currentSection: any = null;
  let currentRequirement: any = null;
  let inTestCases = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect Feature/Section headers (## Feature: ...)
    if (line.startsWith('## Feature:')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        type: 'feature',
        title: line.replace('## Feature:', '').trim(),
        requirements: []
      };
      currentRequirement = null;
      inTestCases = false;
    }
    // Detect Requirement headers (### Requirement: ...)
    else if (line.startsWith('### Requirement:')) {
      if (currentRequirement && currentSection) {
        currentSection.requirements.push(currentRequirement);
      }
      currentRequirement = {
        title: line.replace('### Requirement:', '').trim(),
        priority: 'Medium',
        description: '',
        testCases: []
      };
      inTestCases = false;
    }
    // Detect Priority
    else if (line.startsWith('**Priority:**')) {
      if (currentRequirement) {
        const priority = line.replace('**Priority:**', '').trim();
        currentRequirement.priority = priority;
      }
    }
    // Detect Description
    else if (line.startsWith('**Description:**')) {
      if (currentRequirement) {
        const description = line.replace('**Description:**', '').trim();
        currentRequirement.description = description;
      }
    }
    // Detect Test Cases section
    else if (line.startsWith('**Test Cases:**')) {
      inTestCases = true;
    }
    // Parse test case items
    else if (inTestCases && line.match(/^\d+\./)) {
      if (currentRequirement) {
        const testCase = line.replace(/^\d+\./, '').trim();
        if (testCase) {
          currentRequirement.testCases.push(testCase);
        }
      }
    }
    // Accumulate description lines
    else if (currentRequirement && !inTestCases && line && !line.startsWith('**')) {
      if (currentRequirement.description) {
        currentRequirement.description += ' ' + line;
      } else {
        currentRequirement.description = line;
      }
    }
  }
  
  // Push the last section and requirement
  if (currentRequirement && currentSection) {
    currentSection.requirements.push(currentRequirement);
  }
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If no structured sections found, treat as plain text
  if (sections.length === 0) {
    return {
      metadata: {
        domain: 'general',
        parsedAt: new Date().toISOString(),
        format: 'plain-text'
      },
      sections: [{
        type: 'document',
        title: 'ATRD Document',
        requirements: [{
          title: 'General Requirements',
          priority: 'Medium',
          description: content,
          testCases: []
        }]
      }],
      rawContent: content
    };
  }
  
  return {
    metadata: {
      domain: detectDomain(content),
      parsedAt: new Date().toISOString(),
      format: 'structured'
    },
    sections: sections,
    rawContent: content
  };
}

// Simple domain detection
function detectDomain(content: string): string {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('login') || lowerContent.includes('auth') || lowerContent.includes('user')) {
    return 'functional';
  }
  if (lowerContent.includes('performance') || lowerContent.includes('load')) {
    return 'performance';
  }
  if (lowerContent.includes('security') || lowerContent.includes('vulnerability')) {
    return 'security';
  }
  if (lowerContent.includes('accessibility') || lowerContent.includes('wcag')) {
    return 'accessibility';
  }
  if (lowerContent.includes('visual') || lowerContent.includes('ui')) {
    return 'visual';
  }
  if (lowerContent.includes('data') || lowerContent.includes('etl')) {
    return 'dataQuality';
  }
  return 'functional';
}
