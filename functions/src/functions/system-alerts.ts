import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const generateSystemAlerts = functions
  .region('europe-west1')
  .pubsub.schedule('every 30 minutes')
  .onRun(ctx => {});
