import { describe, it, expect } from 'vitest';
import { parseATRDContent } from '../src/lib/server/atrdParser';

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
});
