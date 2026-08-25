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
    /** Best-guess app URL mentioned in the document, if any — see detectUrls(). */
    detectedUrl: string | null;
    /** Every distinct URL found in the document, in order of first appearance. */
    detectedUrls: string[];
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

  const { detectedUrl, detectedUrls } = detectUrls(content);

  // If no structured sections found, treat as plain text
  if (sections.length === 0) {
    return {
      metadata: {
        domain: 'general',
        parsedAt: new Date().toISOString(),
        format: 'plain-text',
        detectedUrl,
        detectedUrls
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
      format: 'structured',
      detectedUrl,
      detectedUrls
    },
    sections,
    rawContent: content
  };
}

const URL_PATTERN = /https?:\/\/[^\s"'<>()[\]]+/gi;
// A line mentioning one of these words alongside a URL is very likely
// declaring "this is the app/environment under test", as opposed to a URL
// that's just incidental to a requirement (a doc link, a reference, etc.).
const URL_LABEL_PATTERN = /\b(url|target|environment|app|website|site|endpoint|staging|production|host)\b/i;

function cleanUrlMatch(raw: string): string {
  // Strip trailing punctuation a URL regex commonly sweeps up when the URL
  // sits at the end of a sentence or inside parentheses/quotes, e.g.
  // "see https://app.example.com." or "(https://app.example.com)".
  return raw.replace(/[)\].,;:'"]+$/, '');
}

/**
 * Scans an ATRD document's raw text for URLs, so a URL the author already
 * wrote down (a staging link, an "App URL:" line, an environment table) can
 * be offered as the target to actually run generated tests against, instead
 * of the user having to retype it. Returns every distinct URL found plus a
 * best-effort single pick: a URL on a line that also mentions a word like
 * "url"/"environment"/"staging" is preferred over one with no such context.
 */
export function detectUrls(content: string): { detectedUrl: string | null; detectedUrls: string[] } {
  const detectedUrls: string[] = [];
  const seen = new Set<string>();
  let labeledUrl: string | null = null;

  for (const line of content.split('\n')) {
    const matches = line.match(URL_PATTERN);
    if (!matches) continue;

    for (const raw of matches) {
      const url = cleanUrlMatch(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      detectedUrls.push(url);

      if (!labeledUrl && URL_LABEL_PATTERN.test(line.replace(url, ''))) {
        labeledUrl = url;
      }
    }
  }

  return { detectedUrl: labeledUrl || detectedUrls[0] || null, detectedUrls };
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
