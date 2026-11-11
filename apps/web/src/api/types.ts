export interface Category {
  id: number;
  name: string;
  level: number;
}

export interface Team {
  id: string;
  name: string;
  club: string;
  city: string | null;
}

export type LicenseStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

export interface Referee {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  category: Category;
  licenseNumber: string;
  licenseExpiresOn: string;
  licenseStatus: LicenseStatus;
  licenseDaysRemaining: number;
  phone: string | null;
  updatedAt: string;
}

export interface RefereeConflict {
  id: string;
  team: { id: string; name: string; club: string };
  reason: string;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
