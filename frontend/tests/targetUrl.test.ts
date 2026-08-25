import { describe, it, expect, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (hostname: string) => {
    if (hostname === 'example.com') return [{ address: '93.184.216.34', family: 4 }];
    if (hostname === 'internal-app.corp') return [{ address: '10.0.5.9', family: 4 }];
    if (hostname === 'metadata.rebinder.test') return [{ address: '169.254.169.254', family: 4 }];
    if (hostname === 'does-not-resolve.invalid') throw new Error('ENOTFOUND');
    return [];
  })
}));

const { assertSafeTargetUrl, UnsafeTargetUrlError } = await import('../src/lib/server/targetUrl');

describe('assertSafeTargetUrl', () => {
  it('accepts a public https URL', async () => {
    const url = await assertSafeTargetUrl('https://example.com/app');
    expect(url.hostname).toBe('example.com');
  });

  it('rejects non-http(s) schemes', async () => {
    await expect(assertSafeTargetUrl('file:///etc/passwd')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
    await expect(assertSafeTargetUrl('ftp://example.com')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeTargetUrl('not a url')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects URLs with embedded credentials', async () => {
    await expect(assertSafeTargetUrl('https://user:pass@example.com')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects localhost', async () => {
    await expect(assertSafeTargetUrl('http://localhost:3000')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
    await expect(assertSafeTargetUrl('http://foo.localhost')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects a literal loopback/private IP', async () => {
    await expect(assertSafeTargetUrl('http://127.0.0.1:8080')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
    await expect(assertSafeTargetUrl('http://192.168.1.1')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects the cloud metadata link-local address', async () => {
    await expect(assertSafeTargetUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
      UnsafeTargetUrlError
    );
  });

  it('rejects a literal IPv6 loopback', async () => {
    await expect(assertSafeTargetUrl('http://[::1]')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects a hostname that resolves to a private address', async () => {
    await expect(assertSafeTargetUrl('http://internal-app.corp')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects a hostname that resolves to the metadata address', async () => {
    await expect(assertSafeTargetUrl('http://metadata.rebinder.test')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });

  it('rejects a hostname that fails to resolve', async () => {
    await expect(assertSafeTargetUrl('http://does-not-resolve.invalid')).rejects.toBeInstanceOf(UnsafeTargetUrlError);
  });
});
