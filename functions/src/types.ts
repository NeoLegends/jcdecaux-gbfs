// tslint:disable-next-line
import { FieldValue, Timestamp } from "@google-cloud/firestore";

export interface City {
  name: string;
  commercial_name: string;
  cities: string[];
  country_code: string;
}

export interface Station {
  address: string;
  available_bikes: number;
  available_bike_stands: number;
  banking: boolean;
  bike_stands: number;
  last_update: number;
  number: number;
  position: {
    lat: number;
    lng: number;
  };
  status: "OPEN" | "CLOSED";
}

export interface SystemAlert {
  date: Timestamp;
  description?: string;
  lastUpdate: Timestamp;
  stationsDown: string[];
}

export interface SystemAlertToInsert {
  date: FieldValue;
  description?: string;
  lastUpdate: FieldValue;
  stationsDown: string[];
}
