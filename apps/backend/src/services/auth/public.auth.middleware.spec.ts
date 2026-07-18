import { PublicAuthMiddleware } from './public.auth.middleware';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';

/**
 * #857 follow-up: coverage for the public API's actual auth gate
 * (PublicAuthMiddleware). Locks in the exact behaviors Chaewon/Wonhee
 * live-verified by hand in #853 (valid key -> allowed, invalid key -> 401,
 * missing key -> 401) plus the OAuth-token branch and the exception path,
 * none of which had a regression test before.
 */
describe('PublicAuthMiddleware', () => {
  const buildRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const buildReq = (authHeader?: string): any => ({
    headers: authHeader ? { authorization: authHeader } : {},
  });

  const buildMiddleware = (overrides?: {
    getOrgByApiKey?: jest.Mock;
    getOrgByOAuthToken?: jest.Mock;
  }) => {
    const organizationService = {
      getOrgByApiKey: overrides?.getOrgByApiKey ?? jest.fn(),
    } as any;
    const oauthService = {
      getOrgByOAuthToken: overrides?.getOrgByOAuthToken ?? jest.fn(),
    } as any;
    const middleware = new PublicAuthMiddleware(organizationService, oauthService);
    return { middleware, organizationService, oauthService };
  };

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('rejects with 401 "No API Key found" when no authorization header is present', async () => {
    const { middleware } = buildMiddleware();
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'No API Key found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 "Invalid API key" when the key does not resolve to an org', async () => {
    const getOrgByApiKey = jest.fn().mockResolvedValue(null);
    const { middleware } = buildMiddleware({ getOrgByApiKey });
    const req = buildReq('bad_key');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(getOrgByApiKey).toHaveBeenCalledWith('bad_key');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'Invalid API key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a valid API key through, attaching req.org and calling next()', async () => {
    const org = { id: 'org-1', subscription: null };
    const getOrgByApiKey = jest.fn().mockResolvedValue(org);
    const { middleware } = buildMiddleware({ getOrgByApiKey });
    const req = buildReq('good_key');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.org).toMatchObject({ id: 'org-1' });
    expect(req.org.users).toEqual([{ users: { role: 'SUPERADMIN' } }]);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('routes tokens prefixed "pos_" through the OAuth path, not the API-key path', async () => {
    const getOrgByApiKey = jest.fn();
    const getOrgByOAuthToken = jest.fn().mockResolvedValue({
      organization: { id: 'org-oauth', subscription: null },
    });
    const { middleware } = buildMiddleware({ getOrgByApiKey, getOrgByOAuthToken });
    const req = buildReq('pos_sometoken');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(getOrgByOAuthToken).toHaveBeenCalledWith('pos_sometoken');
    expect(getOrgByApiKey).not.toHaveBeenCalled();
    expect(req.org.id).toBe('org-oauth');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects with 401 "Invalid OAuth token" when a pos_ token does not resolve', async () => {
    const getOrgByOAuthToken = jest.fn().mockResolvedValue(null);
    const { middleware } = buildMiddleware({ getOrgByOAuthToken });
    const req = buildReq('pos_bad');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'Invalid OAuth token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 "No subscription found" when STRIPE_SECRET_KEY is set and the org has no subscription', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const getOrgByApiKey = jest.fn().mockResolvedValue({ id: 'org-1', subscription: null });
    const { middleware } = buildMiddleware({ getOrgByApiKey });
    const req = buildReq('good_key');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'No subscription found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows through when STRIPE_SECRET_KEY is set and the org DOES have a subscription', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const getOrgByApiKey = jest.fn().mockResolvedValue({ id: 'org-1', subscription: { id: 'sub-1' } });
    const { middleware } = buildMiddleware({ getOrgByApiKey });
    const req = buildReq('good_key');
    const res = buildRes();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('converts an unexpected lookup failure into HttpForbiddenException rather than leaking the raw error', async () => {
    const getOrgByApiKey = jest.fn().mockRejectedValue(new Error('db connection lost'));
    const { middleware } = buildMiddleware({ getOrgByApiKey });
    const req = buildReq('good_key');
    const res = buildRes();
    const next = jest.fn();

    await expect(middleware.use(req, res, next)).rejects.toBeInstanceOf(HttpForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });
});
