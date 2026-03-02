// Data Source Types
export type DataSourceType = 'gerrit' | 'zuul' | 'github' | 'jira' | 'launchpad';

export interface DataSource {
  id: number;
  name: string;
  type: DataSourceType;
  baseUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: number;
  dataSourceId: number;
  username: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

// Widget Types
export type WidgetType = 'gerrit_recent_changes' | 'gerrit_my_changes' | 'gerrit_user_changes' | 'zuul_periodic_jobs';

export interface Widget {
  id: number;
  type: WidgetType;
  title: string;
  dataSourceId: number;
  config: WidgetConfig;
  refreshInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetConfig {
  project?: string;
  query?: string;
  pipeline?: string;
  branch?: string;
  limit?: number;
  [key: string]: unknown;
}

// Layout Types
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface Layout {
  id: number;
  name: string;
  items: LayoutItem[];
  createdAt: string;
  updatedAt: string;
}

// Gerrit Types
export interface GerritChange {
  id: string;
  project: string;
  branch: string;
  subject: string;
  status: string;
  owner: GerritAccount;
  created: string;
  updated: string;
  insertions: number;
  deletions: number;
  _number: number;
  labels?: Record<string, GerritLabel>;
  reviewers?: Record<string, GerritAccount[]>;
  current_revision?: string;
  mergeable?: boolean;
}

export interface GerritAccount {
  _account_id: number;
  name?: string;
  email?: string;
  username?: string;
}

export interface GerritLabel {
  approved?: GerritAccount;
  rejected?: GerritAccount;
  value?: number;
  all?: Array<{
    value: number;
    _account_id: number;
    name?: string;
  }>;
}

// Zuul Types
export interface ZuulBuildRef {
  project: string;
  branch: string;
  change?: number;
  patchset?: string;
  ref: string;
  ref_url?: string;
}

export interface ZuulBuild {
  uuid: string;
  job_name: string;
  result: string;
  start_time: string;
  end_time: string;
  duration: number;
  pipeline: string;
  log_url: string;
  event_id: string;
  ref: ZuulBuildRef;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Summary Types
export interface WidgetSummary {
  widgetId: number;
  type: WidgetType;
  title: string;
  count: number;
  urgent: number;
  lastUpdated: string;
}

export interface DashboardSummary {
  widgets: WidgetSummary[];
  totalItems: number;
  totalUrgent: number;
  lastUpdated: string;
}

// Create/Update DTOs
export interface CreateDataSourceDto {
  name: string;
  type: DataSourceType;
  baseUrl: string;
}

export interface UpdateDataSourceDto {
  name?: string;
  baseUrl?: string;
}

export interface CreateCredentialDto {
  dataSourceId: number;
  username: string;
  password: string;
}

export interface UpdateCredentialDto {
  username?: string;
  password?: string;
}

export interface CreateWidgetDto {
  type: WidgetType;
  title: string;
  dataSourceId: number;
  config?: WidgetConfig;
  refreshInterval?: number;
}

export interface UpdateWidgetDto {
  title?: string;
  config?: WidgetConfig;
  refreshInterval?: number;
}

export interface UpdateLayoutDto {
  name?: string;
  items: LayoutItem[];
}
