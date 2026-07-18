import {
  isBlockedIPv4,
  isBlockedIPv6,
  isBlockedIp,
  isSafePublicHttpsUrl,
} from './webhook.url.validator';

/**
 * APGM-855/#857: regression guard for the SSRF fix on webhook delivery.
 * A webhook pointed at a blocked-range address (cloud metadata, loopback,
 * private ranges) must be rejected -- this is the exact check bibi flagged
 * as untested after the delivery-time re-validation + ssrfSafeDispatcher fix
 * landed. Uses literal IPs so these run fully offline (no live DNS lookup).
 */
describe('isBlockedIPv4', () => {
  it.each([
    ['169.254.169.254', 'cloud metadata (AWS/GCP link-local)'],
    ['127.0.0.1', 'loopback'],
    ['10.0.0.5', 'private 10.0.0.0/8'],
    ['172.16.0.1', 'private 172.16.0.0/12'],
    ['192.168.1.1', 'private 192.168.0.0/16'],
    ['0.0.0.0', 'unspecified'],
    ['100.64.0.1', 'carrier-grade NAT 100.64.0.0/10'],
    ['198.18.0.1', 'benchmark range 198.18.0.0/15'],
    ['224.0.0.1', 'multicast'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedIPv4(ip)).toBe(true);
  });

  it.each([
    ['8.8.8.8', 'public DNS'],
    ['1.1.1.1', 'public DNS'],
    ['93.184.216.34', 'public host'],
  ])('allows %s (%s)', (ip) => {
    expect(isBlockedIPv4(ip)).toBe(false);
  });
});

describe('isBlockedIPv6', () => {
  it.each([
    ['::1', 'loopback'],
    ['::', 'unspecified'],
    ['fe80::1', 'link-local'],
    ['fc00::1', 'unique local fc00::/7'],
    ['fd00::1', 'unique local fd00::/7'],
    ['ff02::1', 'multicast'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedIPv6(ip)).toBe(true);
  });

  it('allows a public IPv6 address', () => {
    expect(isBlockedIPv6('2606:4700:4700::1111')).toBe(false);
  });
});

describe('isBlockedIp', () => {
  it('unwraps IPv4-mapped IPv6 addresses before checking', () => {
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('treats an unparseable value as blocked (fail closed)', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
});

describe('isSafePublicHttpsUrl', () => {
  it('rejects a webhook URL pointed at cloud metadata via a literal IP', async () => {
    await expect(isSafePublicHttpsUrl('https://169.254.169.254/latest/meta-data')).resolves.toBe(false);
  });

  it('rejects loopback and private-range literal-IP URLs', async () => {
    await expect(isSafePublicHttpsUrl('https://127.0.0.1/hook')).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl('https://10.0.0.5/hook')).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl('https://192.168.1.1/hook')).resolves.toBe(false);
  });

  it('rejects the literal hostname "localhost"', async () => {
    await expect(isSafePublicHttpsUrl('https://localhost/hook')).resolves.toBe(false);
  });

  it('rejects non-HTTPS schemes even for an otherwise-public host', async () => {
    await expect(isSafePublicHttpsUrl('http://example.com/hook')).resolves.toBe(false);
  });

  it('rejects malformed input', async () => {
    await expect(isSafePublicHttpsUrl('not a url')).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl('')).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl(undefined)).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl(12345)).resolves.toBe(false);
  });

  it('allows a public literal-IP HTTPS URL', async () => {
    await expect(isSafePublicHttpsUrl('https://8.8.8.8/hook')).resolves.toBe(true);
  });
});
