import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const TOKEN_KEY = 'smurbok_token';

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as any)?.message ?? `Request failed: ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  language: 'is' | 'en';
  role: 'USER' | 'ADMIN';
  emailNotifications: boolean;
  createdAt: string;
  token?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VehicleListItem {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string | null;
  color: string | null;
  fuelType: string;
  latestMileage: number | null;
  archivedAt: string | null;
  counts: { serviceRecords: number; documents: number; reminders: number };
}

export interface VehicleOverview {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string | null;
  color: string | null;
  fuelType: string;
  archivedAt: string | null;
  latestMileage: number | null;
  estimatedMileage: number | null;
  latestService: { id: string; type: string; date: string; mileage: number; shop: string | null } | null;
  upcomingReminders: { id: string; type: string; dueDate: string | null; dueMileage: number | null; status: string }[];
  counts: { serviceRecords: number; documents: number; expenses: number; reminders: number };
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  type: string;
  mileage: number;
  date: string;
  description: string | null;
  cost: string | null;
  shop: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  category: string;
  amount: string;
  date: string;
  description: string | null;
  createdAt: string;
}

export interface MileageLog {
  id: string;
  vehicleId: string;
  mileage: number;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  type: string;
  dueDate: string | null;
  dueMileage: number | null;
  status: 'PENDING' | 'DONE' | 'SNOOZED';
  note: string | null;
  recurrenceMonths: number | null;
  createdAt: string;
}

export interface Document {
  id: string;
  vehicleId: string;
  type: string;
  label: string;
  fileUrl: string;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CarMake { id: number; name: string; }
export interface CarModel { id: number; name: string; }

export interface TimelineEntry {
  id: string;
  vehicleId: string;
  entryType: 'SERVICE' | 'EXPENSE' | 'MILEAGE';
  date: string;
  type?: string;
  category?: string;
  mileage?: number;
  amount?: string;
  cost?: string;
  description?: string | null;
  shop?: string | null;
  note?: string | null;
}

export interface StorageInfo {
  files: { usedBytes: number; usedMB: number; limitMB: number; percent: number };
  documents: { count: number; limit: number };
  vehicles: { count: number; limit: number };
  topDocuments: { id: string; label: string; type: string; fileSizeBytes: number | null; vehicleId: string; vehicleLabel: string }[];
}

export interface DashboardSummary {
  counts: {
    vehicles: number;
    totalServiceRecords: number;
    pendingReminders: number;
    overdueReminders: number;
  };
  vehicles: { id: string; make: string; model: string; year: number; licensePlate: string; latestMileage: number | null; fuelType?: string; color?: string | null; }[];
  upcomingReminders: {
    id: string;
    vehicleId: string;
    vehicleName: string;
    type: string;
    dueDate: string | null;
    dueMileage: number | null;
    status: string;
    isOverdue: boolean;
  }[];
  recentActivity: {
    id: string;
    vehicleId: string;
    vehicleName: string;
    type: string;
    date: string;
    mileage: number;
    shop: string | null;
  }[];
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  login: (firebaseToken: string) =>
    request<UserProfile & { token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ firebaseToken }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<UserProfile>('/auth/me'),
  updateLanguage: (language: 'is' | 'en') =>
    request<UserProfile>('/auth/me/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    }),
  updateNotifications: (emailNotifications: boolean) =>
    request<UserProfile>('/auth/me/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ emailNotifications }),
    }),
  registerPushToken: (token: string) =>
    request<void>('/auth/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  unregisterPushToken: () =>
    request<void>('/auth/me/push-token', { method: 'DELETE' }),
  requestMagicLink: (email: string, sessionId: string) =>
    request<void>('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email, sessionId }),
    }),
  pollMagicLink: (sessionId: string) =>
    request<{ status: 'pending' | 'verified'; token?: string }>(
      `/auth/magic-link/status?sessionId=${encodeURIComponent(sessionId)}`,
    ),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboard = {
  getSummary: () => request<DashboardSummary>('/dashboard'),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const vehicles = {
  list: (page = 1, limit = 50, archived = false) =>
    request<Paginated<VehicleListItem>>(`/vehicles?page=${page}&limit=${limit}&archived=${archived}`),
  overview: (id: string) => request<VehicleOverview>(`/vehicles/${id}/overview`),
  create: (dto: {
    make: string; model: string; year: number; licensePlate: string;
    vin?: string; color?: string; fuelType?: string;
  }) => request<VehicleListItem>('/vehicles', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<{
    make: string; model: string; year: number; licensePlate: string;
    vin: string; color: string; fuelType: string;
  }>) => request<VehicleListItem>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  archive: (id: string) => request<void>(`/vehicles/${id}/archive`, { method: 'PATCH' }),
  restore: (id: string) => request<void>(`/vehicles/${id}/restore`, { method: 'PATCH' }),
  delete: (id: string) => request<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  undelete: (id: string) => request<void>(`/vehicles/${id}/undelete`, { method: 'POST' }),
  timeline: (id: string, page = 1, limit = 20) =>
    request<Paginated<TimelineEntry>>(`/vehicles/${id}/timeline?page=${page}&limit=${limit}`),
};

// ── Service Records ───────────────────────────────────────────────────────────

export const serviceRecords = {
  list: (vehicleId: string, page = 1, limit = 20) =>
    request<Paginated<ServiceRecord>>(`/vehicles/${vehicleId}/service-records?page=${page}&limit=${limit}`),
  create: (vehicleId: string, dto: {
    type: string; mileage: number; date: string;
    description?: string; cost?: number; shop?: string;
  }) => request<ServiceRecord>(`/vehicles/${vehicleId}/service-records`, { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<{
    type: string; mileage: number; date: string;
    description: string | null; cost: number | null; shop: string | null;
  }>) => request<ServiceRecord>(`/service-records/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/service-records/${id}`, { method: 'DELETE' }),
  undelete: (id: string) => request<void>(`/service-records/${id}/undelete`, { method: 'POST' }),
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export const expenses = {
  list: (vehicleId: string, page = 1, limit = 20) =>
    request<Paginated<Expense>>(`/vehicles/${vehicleId}/expenses?page=${page}&limit=${limit}`),
  create: (vehicleId: string, dto: {
    category: string; amount: number; date: string; description?: string;
  }) => request<Expense>(`/vehicles/${vehicleId}/expenses`, { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<{
    category: string; amount: number; date: string; description: string | null;
  }>) => request<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),
  undelete: (id: string) => request<void>(`/expenses/${id}/undelete`, { method: 'POST' }),
};

// ── Mileage Logs ──────────────────────────────────────────────────────────────

export const mileageLogs = {
  list: (vehicleId: string, page = 1, limit = 20) =>
    request<Paginated<MileageLog>>(`/vehicles/${vehicleId}/mileage-logs?page=${page}&limit=${limit}`),
  create: (vehicleId: string, dto: { mileage: number; date: string; note?: string }) =>
    request<MileageLog>(`/vehicles/${vehicleId}/mileage-logs`, { method: 'POST', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/mileage-logs/${id}`, { method: 'DELETE' }),
  undelete: (id: string) => request<void>(`/mileage-logs/${id}/undelete`, { method: 'POST' }),
};

// ── Reminders ─────────────────────────────────────────────────────────────────

export const reminders = {
  list: (vehicleId: string, page = 1, limit = 50) =>
    request<Paginated<Reminder>>(`/vehicles/${vehicleId}/reminders?page=${page}&limit=${limit}`),
  create: (vehicleId: string, dto: {
    type: string; dueDate?: string; dueMileage?: number; note?: string; recurrenceMonths?: number;
  }) => request<Reminder>(`/vehicles/${vehicleId}/reminders`, { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<{
    type: string; status: string; dueDate: string | null;
    dueMileage: number | null; note: string | null; recurrenceMonths: number | null;
  }>) => request<Reminder>(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  snooze: (id: string, newDueDate: string) =>
    request<Reminder>(`/reminders/${id}/snooze`, { method: 'POST', body: JSON.stringify({ newDueDate }) }),
  delete: (id: string) => request<void>(`/reminders/${id}`, { method: 'DELETE' }),
  undelete: (id: string) => request<void>(`/reminders/${id}/undelete`, { method: 'POST' }),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const documents = {
  list: (vehicleId: string) =>
    request<Paginated<Document>>(`/vehicles/${vehicleId}/documents?page=1&limit=100`),
  getLink: (id: string) =>
    request<{ url: string }>(`/documents/${id}/link`),
  delete: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
  upload: async (vehicleId: string, file: { uri: string; name: string; type: string; label: string; docType: string }) => {
    const token = await getToken();
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    form.append('label', file.label);
    form.append('type', file.docType);
    const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any)?.message ?? `Upload failed: ${res.status}`);
    }
    return res.json() as Promise<Document>;
  },
};

// ── Storage ───────────────────────────────────────────────────────────────────

export const storage = {
  info: () => request<StorageInfo>('/storage'),
};

// ── Auth extras ───────────────────────────────────────────────────────────────

export const authExtras = {
  exportData: () => `${BASE_URL}/auth/me/export`,  // returns URL to open in browser
  deleteAccount: () => request<void>('/auth/me', { method: 'DELETE' }),
};

// ── Reference data ────────────────────────────────────────────────────────────

export const ref = {
  makes: () => request<CarMake[]>('/ref/makes'),
  models: (makeId: number) => request<CarModel[]>(`/ref/makes/${makeId}/models`),
};
