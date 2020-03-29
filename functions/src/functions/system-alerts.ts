import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import { getCities, getStations } from '../jcdecaux';
import { SystemAlertToInsert } from '../types';
import { setsEqual } from '../util';

const generateCurrentAlert = async (city: string, stationsDown: string[]) => {
  const alert: SystemAlertToInsert = {
    date: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
    stationsDown: stationsDown.sort((a, b) => Number(a) - Number(b)),
  };

  await admin
    .firestore()
    .collection('cities')
    .doc(city)
    .collection('system-alerts')
    .add(alert);
};

const processCity = async (city: string) => {
  const [stations, latestAlert] = await Promise.all([
    getStations(city),
    admin
      .firestore()
      .collection('cities')
      .doc(city)
      .collection('system-alerts')
      .orderBy('date', 'desc')
      .limit(1)
      .get(),
  ]);

  const stationsNowDown = new Set(
    stations
      .filter(stat => stat.status === 'CLOSED')
      .map(stat => String(stat.number)),
  );

  if (latestAlert.empty) {
    await generateCurrentAlert(city, [...stationsNowDown]);
    return;
  }

  const stationsPreviouslyDown = new Set<string>(
    latestAlert.docs[0].data().stationsDown,
  );

  if (!setsEqual(stationsNowDown, stationsPreviouslyDown)) {
    await generateCurrentAlert(city, [...stationsNowDown]);
    return;
  }

  await latestAlert.docs[0].ref.update({
    lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
  });
};

export const generateSystemAlerts = functions
  .region('europe-west1')
  .runWith({ memory: '128MB' })
  .pubsub.schedule('every 10 minutes')
  .onRun(async () => {
    const cities = await getCities();
    for (const city of cities) {
      try {
        await processCity(city.name);
      } catch (err) {
        console.error(`Failed generating system alerts for ${city.name}.`);
        console.error(err);
      }
    }
  });
