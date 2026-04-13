export type Language = 'is' | 'en'

export type FuelType =
  | 'PETROL' | 'DIESEL' | 'ELECTRIC'
  | 'HYBRID' | 'PLUG_IN_HYBRID' | 'HYDROGEN'

export type ServiceType =
  | 'OIL_CHANGE' | 'TIRE_ROTATION' | 'TIRE_CHANGE'
  | 'BRAKE_SERVICE' | 'FILTER_CHANGE' | 'INSPECTION'
  | 'TRANSMISSION_SERVICE' | 'COOLANT_FLUSH'
  | 'BATTERY_REPLACEMENT' | 'WINDSHIELD' | 'OTHER'

export type ExpenseCategory =
  | 'FUEL' | 'SERVICE' | 'INSURANCE' | 'TAX'
  | 'PARKING' | 'TOLL' | 'REPAIR' | 'OTHER'

export interface AppUser {
  id: string
  email: string
  displayName: string | null
  language: Language
}

export interface VehicleListItem {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  color: string | null
  fuelType: FuelType
  latestMileage: number | null
  counts: {
    serviceRecords: number
    documents: number
    reminders: number
  }
}

export interface VehicleOverview {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin: string | null
  color: string | null
  fuelType: FuelType
  latestMileage: number | null
  estimatedMileage: number | null
  latestService: {
    id: string
    type: ServiceType
    date: string
    mileage: number
    shop: string | null
  } | null
  upcomingReminders: {
    id: string
    type: string
    dueDate: string | null
    dueMileage: number | null
    status: string
  }[]
  counts: {
    serviceRecords: number
    documents: number
    expenses: number
    reminders: number
  }
}

export interface TimelineEntry {
  id: string
  type: 'service_record' | 'expense' | 'mileage_log'
  date: string
  title: ServiceType | ExpenseCategory | 'MILEAGE_LOG'
  mileage: number | null
  meta: Record<string, unknown>
}

export interface Timeline {
  vehicleId: string
  data: TimelineEntry[]
}

export interface ServiceRecord {
  id: string
  vehicleId: string
  type: ServiceType
  mileage: number
  date: string
  description: string | null
  cost: string | null
  shop: string | null
  createdAt: string
}
