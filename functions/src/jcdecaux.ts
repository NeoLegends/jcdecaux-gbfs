import * as functions from "firebase-functions";
import { Agent } from "https";
import * as rq from "request-promise-native";

import { City, Station } from "./types";

const API_KEY = functions.config().jcdecaux.apikey;
const CITIES_REFETCH_TIMEOUT = 3600 * 1000;

const BASE_URL = "https://api.jcdecaux.com/vls/v1";
const CITIES_URL = `${BASE_URL}/contracts`;
const STATIONS_URL = `${BASE_URL}/stations`;

const abuseHeaders = {
  "User-Agent": "jcdecaux-gbfs/v1",
  "X-Abuse-Contact": "jcdecaux@moritzgunz.de",
};
const agent = new Agent({ keepAlive: true });

let cities: City[] = [];
let citiesLastFetched = 0;

export const getCity = async (city: string) => {
  const allCities = await getCities();
  return allCities.find((c) => c.name === city);
};

export const getCities = async () => {
  if (cities.length && Date.now() - citiesLastFetched < CITIES_REFETCH_TIMEOUT) {
    return cities;
  }

  cities = await rq(CITIES_URL, {
    agent,
    headers: abuseHeaders,
    qs: { apiKey: API_KEY },
    json: true,
  });
  citiesLastFetched = Date.now();

  // The API returns invalid data in some cases
  for (const city of cities) {
    if (city.name === "valence") {
      city.country_code = "ES";
      city.commercial_name = "Valenbisi";
      city.cities = ["Valencia"];
    } else if (city.name === "seville") {
      city.country_code = "ES";
      city.commercial_name = "Sevici";
      city.cities = ["Sevilla"];
    } else if (city.name === "besancon") {
      city.country_code = "FR";
      city.commercial_name = "VéloCité";
      city.cities = ["Besançon"];
    }
  }

  return cities;
};

export const getStations = async (city: string): Promise<Station[]> => {
  const stations: Station[] = await rq(STATIONS_URL, {
    agent,
    headers: abuseHeaders,
    qs: { apiKey: API_KEY, contract: city },
    json: true,
  });
  stations.sort((a, b) => a.number - b.number);
  return stations;
};
