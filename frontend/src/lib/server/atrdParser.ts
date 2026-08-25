// Shared ATRD (Automation Test Requirement Document) text parser, used by
// src/routes/api/atrd/parse/+server.ts. Lives here (rather than in the
// +server.ts file) because SvelteKit route modules may only export the
// reserved HTTP-verb handlers — anything else fails the production build.

export interface ParsedRequirement {
  title: string;
  priority: string;
  description: string;
  testCases: string[];
}

export interface ParsedSection {
  type: 'feature' | 'document';
  title: string;
  requirements: ParsedRequirement[];
}

export interface ParsedATRD {
  metadata: {
    domain: string;
    parsedAt: string;
    format: 'structured' | 'plain-text';
  };
  sections: ParsedSection[];
  rawContent: string;
}

export function parseATRDContent(content: string): ParsedATRD {
  const lines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentRequirement: ParsedRequirement | null = null;
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
        currentRequirement.priority = line.replace('**Priority:**', '').trim();
      }
    }
    // Detect Description
    else if (line.startsWith('**Description:**')) {
      if (currentRequirement) {
        currentRequirement.description = line.replace('**Description:**', '').trim();
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
      sections: [
        {
          type: 'document',
          title: 'ATRD Document',
          requirements: [
            {
              title: 'General Requirements',
              priority: 'Medium',
              description: content,
              testCases: []
            }
          ]
        }
      ],
      rawContent: content
    };
  }

  return {
    metadata: {
      domain: detectDomain(content),
      parsedAt: new Date().toISOString(),
      format: 'structured'
    },
    sections,
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
