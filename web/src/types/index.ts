export type Language = 'is' | 'en'

export type FuelType =
  | 'PETROL' | 'DIESEL' | 'ELECTRIC'
  | 'HYBRID' | 'PLUG_IN_HYBRID' | 'HYDROGEN'

export type ServiceType =
  | 'OIL_CHANGE' | 'ENGINE_OIL_CHANGE' | 'TRANSMISSION_OIL_CHANGE'
  | 'TIRE_ROTATION' | 'TIRE_CHANGE'
  | 'BRAKE_SERVICE' | 'BRAKE_DISCS' | 'BRAKE_PADS' | 'BRAKE_BANDS' | 'HANDBRAKE'
  | 'FILTER_CHANGE' | 'OIL_FILTER' | 'FUEL_FILTER' | 'TRANSMISSION_FILTER' | 'AIR_FILTER' | 'CABIN_FILTER'
  | 'INSPECTION' | 'MAIN_INSPECTION' | 'RE_INSPECTION'
  | 'TRANSMISSION_SERVICE' | 'COOLANT_FLUSH'
  | 'BATTERY_REPLACEMENT'
  | 'WINDSHIELD' | 'WINDSHIELD_REPAIR' | 'WINDSHIELD_REPLACEMENT'
  | 'OTHER'

export type ExpenseCategory =
  | 'FUEL' | 'SERVICE' | 'INSURANCE' | 'TAX'
  | 'PARKING' | 'TOLL' | 'REPAIR' | 'THRIF' | 'OTHER'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Document {
  id: string
  vehicleId: string
  serviceRecordId: string | null
  expenseId: string | null
  type: string
  label: string
  fileUrl: string
  fileSizeBytes: number | null
  createdAt: string
}

export interface AppUser {
  id: string
  email: string
  displayName: string | null
  language: Language
  currency: string
  role: string
  tier: number
  hasKlingSubscription: boolean
  emailNotifications: boolean
  createdAt: string
}

export interface VehicleListItem {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin: string | null
  color: string | null
  fuelType: FuelType
  latestMileage: number | null
  archivedAt: string | null
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
  estimatedDailyKm: number | null
  latestService: {
    id: string
    types: ServiceType[]
    customType: string | null
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

export type TimelineEntry =
  | {
      id: string
      vehicleId: string
      entryType: 'SERVICE'
      date: string
      types: ServiceType[]
      customType: string | null
      mileage: number
      cost: string | null
      shop: string | null
      description: string | null
      documents: Document[]
    }
  | {
      id: string
      vehicleId: string
      entryType: 'EXPENSE'
      date: string
      category: ExpenseCategory
      amount: string | null
      description: string | null
      litres: string | null
      customCategory: string | null
      recurringMonths: number | null
      documents: Document[]
    }
  | {
      id: string
      vehicleId: string
      entryType: 'MILEAGE'
      date: string
      mileage: number
      note: string | null
    }

export type Timeline = Paginated<TimelineEntry>

export interface ServiceRecord {
  id: string
  vehicleId: string
  types: ServiceType[]
  customType: string | null
  mileage: number
  date: string
  description: string | null
  cost: string | null
  shop: string | null
  documents: Document[]
  createdAt: string
}

export interface Expense {
  id: string
  vehicleId: string
  category: ExpenseCategory
  amount: string
  date: string
  description: string | null
  litres: string | null
  customCategory: string | null
  recurringMonths: number | null
  mileage: number | null
  documents: Document[]
  createdAt: string
}

export interface MileageLog {
  id: string
  vehicleId: string
  mileage: number
  date: string
  note: string | null
  createdAt: string
}
