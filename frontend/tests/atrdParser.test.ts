import { describe, it, expect } from 'vitest';
import { parseATRDContent, detectUrls } from '../src/lib/server/atrdParser';

describe('parseATRDContent', () => {
  it('parses features, requirements, priority, description, and test cases', () => {
    const doc = `
## Feature: Login

### Requirement: Email/password sign in
**Priority:** Critical
**Description:** Users can sign in with a valid email and password.
**Test Cases:**
1. Valid credentials log the user in
2. Invalid password shows an error
`;

    const parsed = parseATRDContent(doc);

    expect(parsed.sections).toHaveLength(1);
    const feature = parsed.sections[0];
    expect(feature.type).toBe('feature');
    expect(feature.title).toBe('Login');
    expect(feature.requirements).toHaveLength(1);

    const requirement = feature.requirements[0];
    expect(requirement.title).toBe('Email/password sign in');
    expect(requirement.priority).toBe('Critical');
    expect(requirement.description).toBe('Users can sign in with a valid email and password.');
    expect(requirement.testCases).toEqual([
      'Valid credentials log the user in',
      'Invalid password shows an error'
    ]);
  });

  it('defaults priority to Medium when not specified', () => {
    const doc = `
## Feature: Search

### Requirement: Full-text search
**Description:** Search returns matching results.
`;
    const parsed = parseATRDContent(doc);
    expect(parsed.sections[0].requirements[0].priority).toBe('Medium');
  });

  it('falls back to a single plain-text document section when there are no Feature headers', () => {
    const parsed = parseATRDContent('just some plain notes, no structure');

    expect(parsed.metadata.format).toBe('plain-text');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].type).toBe('document');
    expect(parsed.sections[0].requirements[0].description).toBe('just some plain notes, no structure');
  });

  it('surfaces a detected URL on parsed metadata', () => {
    const doc = `
## Feature: Login

### Requirement: Sign in
**Priority:** Critical
**Description:** Staging environment: https://staging.acme.example/app
`;
    const parsed = parseATRDContent(doc);
    expect(parsed.metadata.detectedUrl).toBe('https://staging.acme.example/app');
    expect(parsed.metadata.detectedUrls).toEqual(['https://staging.acme.example/app']);
  });

  it('has no detected URL when the document mentions none', () => {
    const parsed = parseATRDContent('## Feature: Login\n### Requirement: Sign in\n**Priority:** High\n');
    expect(parsed.metadata.detectedUrl).toBeNull();
    expect(parsed.metadata.detectedUrls).toEqual([]);
  });
});

describe('detectUrls', () => {
  it('prefers a URL on a line with contextual labeling over an earlier incidental one', () => {
    const doc = `
See the design doc at https://docs.example.com/spec for background.
Target environment: https://app.example.com
`;
    const { detectedUrl, detectedUrls } = detectUrls(doc);
    expect(detectedUrl).toBe('https://app.example.com');
    expect(detectedUrls).toEqual(['https://docs.example.com/spec', 'https://app.example.com']);
  });

  it('falls back to the first URL found when none are labeled', () => {
    const { detectedUrl } = detectUrls('Random link: https://one.example.com and https://two.example.com');
    expect(detectedUrl).toBe('https://one.example.com');
  });

  it('strips trailing sentence punctuation and parens/quotes from a matched URL', () => {
    const { detectedUrls } = detectUrls('Visit (https://example.com/app), or "https://example.com/other".');
    expect(detectedUrls).toEqual(['https://example.com/app', 'https://example.com/other']);
  });

  it('deduplicates repeated URLs', () => {
    const { detectedUrls } = detectUrls('https://example.com/app\nagain: https://example.com/app');
    expect(detectedUrls).toEqual(['https://example.com/app']);
  });

  it('returns null/empty when there are no URLs', () => {
    expect(detectUrls('no links here')).toEqual({ detectedUrl: null, detectedUrls: [] });
  });
});
