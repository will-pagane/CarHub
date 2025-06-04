
export enum FuelType {
  GASOLINE = 'Gasolina',
  ETHANOL = 'Etanol',
  DIESEL = 'Diesel',
  CNG = 'GNV',
}

export enum MaintenanceType {
  PREVENTIVE = 'Preventiva',
  CORRECTIVE = 'Corretiva',
  IMPROVEMENT = 'Melhoria',
  PERIODIC_REVIEW = 'Revisão Periódica',
}

export enum MaintenanceCategory {
  ENGINE = 'Motor',
  BRAKES = 'Freios',
  SUSPENSION = 'Suspensão',
  TIRES = 'Pneus',
  ELECTRICAL = 'Elétrica',
  BODYWORK = 'Funilaria',
  OIL_FILTERS = 'Óleo e Filtros',
  OTHER = 'Outros',
}

export interface FuelingRecord {
  id: string;
  vehicleId: string;
  userId: string; 
  date: string; // ISO string
  mileage: number;
  fuelType: FuelType;
  liters: number;
  cost: number;
  isFullTank: boolean;
  kmPerLiter?: number;
  station?: string;
  createdAt?: string; // ISO string from server
  updatedAt?: string; // ISO string from server
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  userId: string; 
  date: string; // ISO string
  mileage?: number;
  description: string;
  cost: number;
  type: MaintenanceType;
  category: MaintenanceCategory;
  notes?: string;
  createdAt?: string; // ISO string from server
  updatedAt?: string; // ISO string from server
}

export interface Vehicle {
  id: string;
  userId: string; // Will be set by backend based on authenticated user
  name: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  createdAt?: string; // ISO string from server, e.g., "2023-10-27T10:00:00.000Z"
  updatedAt?: string; // ISO string from server
}

export interface GoogleUser {
  id: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}
