import { RequestHandler } from 'express';
import { unknownError } from './errors';

export const setsEqual = <T>(a: Set<T>, b: Set<T>) =>
  a.size === b.size && [...a].every(v => b.has(v));

export const wrapAsync = (fn: RequestHandler) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, undefined!)).catch(next);
  } catch (err) {
    console.error('Error while handling a request:', err);
    return unknownError(res);
  }
};

export const wrapResponse = <T>(resp: T, ttlSeconds = 0) => ({
  last_updated: Math.round(Date.now() / 1000),
  ttl: ttlSeconds,
  data: resp,
});
