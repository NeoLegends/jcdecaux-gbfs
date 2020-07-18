import "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export * from "./functions/gbfs";
export * from "./functions/system-alerts";
