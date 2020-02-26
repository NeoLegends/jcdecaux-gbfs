import { RequestHandler } from 'express';
import { unknownError } from './errors';

export const wrapAsync = (fn: RequestHandler) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, undefined!)).catch(next);
  } catch (err) {
    console.error("Error while handling a request:", err);
    return unknownError(res);
  }
};

export const wrapResponse = (resp: unknown, ttlSeconds = 0) => ({
  last_updated: Math.round(Date.now() / 1000),
  ttl: ttlSeconds,
  data: resp,
});
