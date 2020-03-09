import * as compression from 'compression';
import * as tz from 'countries-and-timezones';
import * as express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import {
  missingCityError,
  unknownCityError,
  unknownError,
  unsupportedFeedError,
} from '../errors';
import { getStations, getCity, City } from '../jcdecaux';
import { wrapAsync, wrapResponse } from '../util';

const app = express();
app.use(compression());

declare global {
  namespace Express {
    export interface Request {
      city?: City;
    }
  }
}

const cityMiddleware: express.RequestHandler = (req, res, next) => {
  if (!req.params.city) {
    return missingCityError(res);
  }

  return getCity(req.params.city)
    .then(city => {
      if (!city) {
        return unknownCityError(req.params.city, res);
      }

      req.city = city;
      next();
    })
    .catch(err => {
      console.error('Error while fetching city:', err);
      return unknownError(res);
    });
};

app.get('/:city/gbfs.json', cityMiddleware, (req, res) => {
  const makeFeed = (city: string, feed: string) => ({
    name: feed,
    url: `https://europe-west1-jcdecaux-gbfs.cloudfunctions.net/gbfs/${city}/${feed}.json`,
  });

  return res.json(
    wrapResponse(
      {
        en: {
          feeds: [
            makeFeed(req.params.city, 'system_information'),
            makeFeed(req.params.city, 'station_information'),
            makeFeed(req.params.city, 'station_status'),
            makeFeed(req.params.city, 'system_hours'),
            makeFeed(req.params.city, 'system_calendar'),
            makeFeed(req.params.city, 'system_alerts'),
          ],
        },
      },
      3600 * 24,
    ),
  );
});

app.get('/:city/system_information.json', cityMiddleware, (req, res) => {
  const tzData = tz.getCountry(req.city!.country_code);
  if (!tzData) {
    console.error(
      `Missing TZ data for city ${req.city!.name} in ${req.city!.country_code}`,
    );
    return unknownError(res);
  }

  return res.json(
    wrapResponse({
      system_id: req.params.city,
      language: 'en',
      name: req.city!.commercial_name,
      operator: 'JCDecaux',
      timezone: tzData.timezones[0],
    }),
  );
});

app.get(
  '/:city/station_information.json',
  cityMiddleware,
  wrapAsync(async (req, res) => {
    const stations = await getStations(req.city!.name);
    return res.json(
      wrapResponse({
        stations: stations.map(stat => ({
          station_id: String(stat.number),
          name: stat.address,
          lat: stat.position.lat,
          lon: stat.position.lng,
          rental_methods: stat.banking
            ? ['TRANSITCARD', 'KEY', 'CREDITCARD', 'APPLEPAY', 'ANDROIDPAY']
            : ['TRANSITCARD', 'KEY'],
          capacity: stat.bike_stands,
        })),
      }),
    );
  }),
);

app.get(
  '/:city/station_status.json',
  cityMiddleware,
  wrapAsync(async (req, res) => {
    const stations = await getStations(req.city!.name);
    return res.json(
      wrapResponse({
        stations: stations.map(stat => {
          const isEnabled = stat.status === 'OPEN' && stat.available_bike_stands > 0;
          return {
            station_id: String(stat.number),
            num_bikes_available: stat.available_bikes,
            num_docks_available: stat.available_bike_stands,
            is_installed: true,
            is_renting: isEnabled,
            is_returning: isEnabled,
            last_reported: Math.round(stat.last_update / 1000),
          };
        }),
      }),
    );
  }),
);

app.get('/:city/system_hours.json', cityMiddleware, (_, res) => {
  return res.json(
    wrapResponse(
      {
        rental_hours: [
          {
            user_types: ['member'],
            days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            start_time: '00:00:00',
            end_time: '23:59:59',
          },
        ],
      },
      3600 * 24,
    ),
  );
});

app.get('/:city/system_calendar.json', cityMiddleware, (_, res) => {
  return res.json(
    wrapResponse(
      {
        calendars: [
          {
            start_month: 1,
            start_day: 1,
            end_month: 12,
            end_day: 31,
          },
        ],
      },
      3600 * 24,
    ),
  );
});

app.get(
  '/:city/system_alerts.json',
  cityMiddleware,
  wrapAsync(async (req, res) => {
    const latestAlert = await admin
      .firestore()
      .collection('cities')
      .doc(req.city!.name)
      .collection('system-alerts')
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    if (latestAlert.empty) {
      return res.json(wrapResponse({ alerts: [] }, 10 * 60));
    }

    const alertDoc = latestAlert.docs[0];
    const { date, lastUpdate, stationsDown } = alertDoc.data();

    const alerts =
      stationsDown.length > 0
        ? [
            {
              alert_id: alertDoc.id,
              last_updated: (lastUpdate as FirebaseFirestore.Timestamp).seconds,
              station_ids: stationsDown,
              summary: `${stationsDown.join(', ')} are down.`,
              times: {
                start: (date as FirebaseFirestore.Timestamp).seconds,
              },
              type: 'STATION_CLOSURE',
            },
          ]
        : [];

    return res.json(wrapResponse({ alerts }));
  }),
);

const unsupportedFeed = (_, res: express.Response) => unsupportedFeedError(res);

app.get('/:city/free_bike_status.json', unsupportedFeed);
app.get('/:city/system_pricing_plans.json', unsupportedFeed);
app.get('/:city/system_regions.json', unsupportedFeed);

export const gbfs = functions.region('europe-west1').https.onRequest(app);
