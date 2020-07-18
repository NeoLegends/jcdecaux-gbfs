import { Response } from "express";

export const enum Errors {
  MissingCity = "MISSING_CITY",
  Unknown = "UNKNOWN",
  UnknownCity = "UNKNOWN_CITY",
  UnsupportedFeed = "UNSUPPORTED_FEED",
}

export const missingCityError = (res: Response) => {
  res.status(400).json({
    code: Errors.MissingCity,
    msg: "Missing city URL parameter",
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
    msg: "An error occured",
  });
};

export const unsupportedFeedError = (res: Response) => {
  res.status(404).json({
    code: Errors.UnsupportedFeed,
    msg: "Unsupported GBFS feed",
  });
};
