// Data Source Types
export type DataSourceType = 'gerrit' | 'zuul' | 'irc' | 'github' | 'jira' | 'launchpad';

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
export type WidgetType = 'gerrit_recent_changes' | 'gerrit_my_changes' | 'gerrit_user_changes' | 'gerrit_custom_query' | 'zuul_periodic_jobs' | 'irc_recent_messages' | 'launchpad_bugs';

export interface Widget {
  id: number;
  dashboardId: number;
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
  channel?: string;
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

// Dashboard Types
export interface Dashboard {
  id: number;
  name: string;
  position: number;
  layout: LayoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWithCounts extends Dashboard {
  widgetCount: number;
  attentionCount: number;
}

// Dashboard Export/Import Types
export interface ExportedWidget {
  type: WidgetType;
  title: string;
  dataSourceType: DataSourceType;
  config: WidgetConfig;
  refreshInterval: number;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardExport {
  version: number;
  exportedAt: string;
  dashboard: {
    name: string;
  };
  widgets: ExportedWidget[];
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
  /** Patch set number of the current revision. */
  current_revision_number?: number;
  mergeable?: boolean;
  topic?: string;
  hashtags?: string[];
  /** Only present (true) when the change is marked Work In Progress. */
  work_in_progress?: boolean;
  /** Keyed by account id. */
  attention_set?: Record<string, GerritAttentionSetInfo>;
  unresolved_comment_count?: number;
  total_comment_count?: number;
  /** Set on the last change of a result page when more results exist. */
  _more_changes?: boolean;
}

export interface GerritAccount {
  _account_id: number;
  name?: string;
  display_name?: string;
  email?: string;
  username?: string;
  /** e.g. ["SERVICE_USER"] for bots (proposal-bot, zuul). */
  tags?: string[];
}

export interface GerritAttentionSetInfo {
  account: GerritAccount;
  last_update?: string;
  reason?: string;
  reason_account?: GerritAccount;
}

export interface GerritApprovalInfo extends GerritAccount {
  /** Omitted when the vote is 0 (reviewer without a vote). */
  value?: number;
  date?: string;
  tag?: string;
}

export interface GerritLabel {
  approved?: GerritAccount;
  rejected?: GerritAccount;
  recommended?: GerritAccount;
  disliked?: GerritAccount;
  value?: number;
  all?: GerritApprovalInfo[];
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
  /** false for builds Zuul retries automatically (result RETRY); shown as warnings. */
  final?: boolean;
  /** false for non-voting jobs. */
  voting?: boolean;
  error_detail?: string | null;
  event_timestamp?: string;
}

// IRC Types
export interface IrcMessage {
  id: string;
  timestamp: string;
  time: string;
  nick: string;
  message: string;
  color: string;
  type: 'message' | 'action' | 'nickchange' | 'join' | 'part';
  date: string;
}

export interface IrcLogResponse {
  channel: string;
  messages: IrcMessage[];
  dates: string[];
}

// Launchpad Types
export type LaunchpadBugStatus = 'New' | 'Incomplete' | 'Confirmed' | 'Triaged' | 'In Progress' | 'Fix Committed' | 'Fix Released';
export type LaunchpadBugImportance = 'Critical' | 'High' | 'Medium' | 'Low' | 'Wishlist' | 'Undecided';

export interface LaunchpadBugTask {
  self_link: string;
  web_link: string;
  bug_link: string;
  title: string;
  status: LaunchpadBugStatus;
  importance: LaunchpadBugImportance;
  assignee_link: string | null;
  owner_link: string;
  date_created: string;
  date_assigned: string | null;
  date_confirmed: string | null;
  date_fix_committed: string | null;
  date_fix_released: string | null;
  date_in_progress: string | null;
  date_triaged: string | null;
  bug_target_name: string;
}

export interface LaunchpadBug {
  id: number;
  self_link: string;
  web_link: string;
  title: string;
  description: string;
  tags: string[];
  heat: number;
  date_created: string;
  date_last_updated: string;
  owner_link: string;
}

export interface LaunchpadBugWithTask extends LaunchpadBugTask {
  bug_id: number;
  bug?: LaunchpadBug;
  reporter_name?: string;
  assignee_name?: string;
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
  dashboardId?: number;
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

export interface CreateDashboardDto {
  name: string;
  position?: number;
}

export interface UpdateDashboardDto {
  name?: string;
  position?: number;
  layout?: LayoutItem[];
}
