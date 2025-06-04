
import { FuelType, MaintenanceType, MaintenanceCategory, Vehicle } from './types';

export const APP_NAME = "CarHub";

// IMPORTANT: Replace with your actual Google Client ID
export const GOOGLE_CLIENT_ID = "520857717970-nlkvdonk9f42df8nlmomsodo13n688o6.apps.googleusercontent.com"; 

export const FUEL_TYPES_OPTIONS = Object.values(FuelType).map(value => ({ value, label: value }));
export const MAINTENANCE_TYPE_OPTIONS = Object.values(MaintenanceType).map(value => ({ value, label: value }));
export const MAINTENANCE_CATEGORY_OPTIONS = Object.values(MaintenanceCategory).map(value => ({ value, label: value }));

// Keys for local storage items that are NOT primary data stores anymore, but UI preferences
// export const FUELING_RECORDS_KEY = 'gvi_fuelingRecords_v2'; // No longer primary data source
// export const MAINTENANCE_RECORDS_KEY = 'gvi_maintenanceRecords_v2'; // No longer primary data source
// export const VEHICLES_KEY = 'gvi_vehicles_v2'; // No longer primary data source
export const ACTIVE_VEHICLE_ID_KEY = 'gvi_activeVehicleId'; 
export const LOGGED_IN_USER_KEY = 'gvi_loggedInUser';
export const THEME_KEY = 'carhub_theme';


export const CHART_COLORS = ['#4285F4', '#0F9D58', '#F4B400', '#DB4437', '#AB47BC', '#5C6BC0', '#26A69A'];
// Google Blue, Google Green, Google Yellow, Google Red, Purple, Indigo, Teal inspired

export const DEFAULT_VEHICLE_DATA: Omit<Vehicle, 'id' | 'userId'> = {
  name: 'Meu Veículo Principal',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  licensePlate: ''
};
