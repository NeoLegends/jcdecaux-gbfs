import { RequestHandler } from 'express';

export const wrapAsync = (fn: RequestHandler) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, undefined!)).catch(next);
  } catch (err) {
    next(err);
  }
};

export const wrapResponse = (resp: unknown) => ({
  last_updated: Math.round(Date.now() / 1000),
  ttl: 0,
  data: resp,
});
