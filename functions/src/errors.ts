import { Response } from 'express';

export const enum Errors {
  MissingCity = 'MISSING_CITY',
  Unknown = 'UNKNOWN',
  UnknownCity = 'UNKNOWN_CITY',
}

export const missingCityError = (res: Response) => {
  res.status(400).json({
    code: Errors.MissingCity,
    msg: 'Missing city URL parameter',
  });
};

export const unknownCityError = (city: string, res: Response) => {
  res.status(400).json({
    code: Errors.UnknownCity,
    msg: `Unknown city '${city}'.`,
  });
};

export const unknownError = (res: Response) => {
  res.status(500).json({
    code: Errors.Unknown,
    msg: 'An error occured',
  });
};
