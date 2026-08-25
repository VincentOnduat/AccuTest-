// Validates a user-supplied "website to test" URL before it's ever handed to
// the real Playwright runner (see testRunner.ts).
//
// This matters because AccuTest's execution model is: an authenticated user
// types a URL, and our server spawns a real headless browser that fetches
// it. Without a check like this, that's a textbook SSRF primitive — a user
// could point "the site to test" at http://169.254.169.254/ (cloud instance
// metadata), an internal admin panel, or another tenant's private service,
// and use AccuTest's own infrastructure to reach it. So every target URL is
// resolved and checked against private/reserved address ranges before it's
// used as a Playwright baseURL.
//
// Known limitation: this resolves the hostname once, at validation time. A
// host that changes its DNS answer between this check and the moment
// Playwright's own connection happens (a "DNS rebinding" attack) could still
// slip through, since we don't pin the checked IP for the actual navigation.
// Treat this as a meaningful deterrent, not an airtight guarantee — if
// AccuTest ever needs to be hardened against a fully malicious tenant, the
// browser's own DNS resolution needs to be pinned too (e.g. routing through
// a proxy that re-checks every connection).

import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

export class UnsafeTargetUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

// Loopback, private (RFC1918), link-local (incl. cloud metadata at
// 169.254.169.254), carrier-grade NAT, "this network", and multicast/reserved.
const BLOCKED_IPV4_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/4',
  '240.0.0.0/4'
];

function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((cidr) => inCidr(ip, cidr));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true;
  // fc00::/7 unique local
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  // IPv4-mapped ::ffff:a.b.c.d — check the embedded IPv4 address
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/**
 * Parses and validates a target URL for real browser execution. Resolves
 * `httpUrl`'s hostname and rejects it if the URL scheme isn't http(s), it
 * carries embedded credentials, or it (or anything it resolves to) is a
 * loopback/private/link-local/reserved address. Returns the parsed URL on
 * success; throws `UnsafeTargetUrlError` with a user-facing message otherwise.
 */
export async function assertSafeTargetUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeTargetUrlError('Enter a valid URL, e.g. https://example.com');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeTargetUrlError('Only http:// and https:// URLs are supported.');
  }
  if (url.username || url.password) {
    throw new UnsafeTargetUrlError('URLs with embedded credentials are not allowed.');
  }

  const hostname = url.hostname;
  if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost')) {
    throw new UnsafeTargetUrlError('Cannot target localhost.');
  }

  // A literal IP in the URL — check it directly, no DNS involved.
  if (isIPv4(hostname)) {
    if (isBlockedIpv4(hostname)) {
      throw new UnsafeTargetUrlError('That address is not a publicly routable host.');
    }
    return url;
  }
  if (isIPv6(hostname)) {
    if (isBlockedIpv6(hostname)) {
      throw new UnsafeTargetUrlError('That address is not a publicly routable host.');
    }
    return url;
  }

  // A hostname — resolve it and check every address DNS returns. Only one
  // needs to be internal to make this exploitable.
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeTargetUrlError(`Could not resolve "${hostname}". Check the URL and try again.`);
  }
  if (addresses.length === 0) {
    throw new UnsafeTargetUrlError(`Could not resolve "${hostname}". Check the URL and try again.`);
  }

  for (const { address, family } of addresses) {
    const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
    if (blocked) {
      throw new UnsafeTargetUrlError(`"${hostname}" resolves to a private/internal address and can't be tested.`);
    }
  }

  return url;
}
