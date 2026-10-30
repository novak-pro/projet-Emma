export type DamageType =
  | "NID_DE_POULE"
  | "FISSURE"
  | "AFFAISSEMENT"
  | "ORNIERE"
  | "EROSION"
  | "AUTRE";

export type SeverityClass = "LEGERE" | "MODEREE" | "GRAVE" | "CRITIQUE";

export type ReportStatus =
  | "NOUVEAU"
  | "CONFIRME"
  | "EN_REPARATION"
  | "REPARE"
  | "REJETE";

export interface Photo {
  id: string;
  url: string;
  reportId: string;
}

export interface Report {
  id: string;
  latitude: number;
  longitude: number;
  region: string | null;
  city: string | null;
  roadName: string | null;
  damageType: DamageType;
  sizeEstimate: number | null;
  description: string | null;
  severityScore: number | null;
  severityClass: SeverityClass | null;
  status: ReportStatus;
  reporterName: string | null;
  reporterPhone: string | null;
  createdAt: string;
  updatedAt: string;
  photos: Photo[];
}

export interface Admin {
  id: string;
  email: string;
  name: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface Summary {
  totals: {
    reports: number;
    last30d: number;
    avgSeverity: number | null;
    critical: number;
    unresolved: number;
  };
  byStatus: Array<{ status: ReportStatus; count: number }>;
  byDamageType: Array<{ damageType: DamageType; count: number }>;
  bySeverity: Array<{ severityClass: SeverityClass; count: number }>;
  byRegion: Array<{ region: string; count: number; avgSeverity: number | null }>;
  recentPoints: Array<{
    id: string;
    latitude: number;
    longitude: number;
    severityClass: SeverityClass | null;
    status: ReportStatus;
    city: string | null;
    roadName: string | null;
  }>;
}

export interface Trends {
  months: Array<{ month: string; count: number; avgSeverity: number | null }>;
  forecast: Array<{ month: string; count: number }>;
}

export interface Cluster {
  latitude: number;
  longitude: number;
  count: number;
  avgSeverity: number | null;
  region: string | null;
  city: string | null;
  damageTypes: DamageType[];
}

export interface Clusters {
  epsKm: number;
  minSamples: number;
  clusterCount: number;
  noiseCount: number;
  clusters: Cluster[];
}

export interface AuthResponse {
  token: string;
  admin: Admin;
}
