import type {
  ApiResponse,
  DataSource,
  CreateDataSourceDto,
  UpdateDataSourceDto,
  Credential,
  CreateCredentialDto,
  UpdateCredentialDto,
  Widget,
  CreateWidgetDto,
  UpdateWidgetDto,
  Layout,
  UpdateLayoutDto,
  GerritChange,
  ZuulBuild,
  IrcMessage,
  DashboardSummary,
} from '@dashboard/shared';

const API_BASE = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.data as T;
}

export const dataSourcesApi = {
  getAll: () => request<DataSource[]>('/datasources'),
  get: (id: number) => request<DataSource>(`/datasources/${id}`),
  create: (dto: CreateDataSourceDto) =>
    request<DataSource>('/datasources', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdateDataSourceDto) =>
    request<DataSource>(`/datasources/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) =>
    request<null>(`/datasources/${id}`, { method: 'DELETE' }),
};

export const credentialsApi = {
  getAll: () => request<Credential[]>('/credentials'),
  get: (dataSourceId: number) => request<Credential>(`/credentials/${dataSourceId}`),
  create: (dto: CreateCredentialDto) =>
    request<Credential>('/credentials', { method: 'POST', body: JSON.stringify(dto) }),
  update: (dataSourceId: number, dto: UpdateCredentialDto) =>
    request<Credential>(`/credentials/${dataSourceId}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (dataSourceId: number) =>
    request<null>(`/credentials/${dataSourceId}`, { method: 'DELETE' }),
};

export const widgetsApi = {
  getAll: () => request<Widget[]>('/widgets'),
  get: (id: number) => request<Widget>(`/widgets/${id}`),
  create: (dto: CreateWidgetDto) =>
    request<Widget>('/widgets', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: UpdateWidgetDto) =>
    request<Widget>(`/widgets/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) =>
    request<null>(`/widgets/${id}`, { method: 'DELETE' }),
};

export const layoutApi = {
  get: () => request<Layout>('/layout'),
  update: (dto: UpdateLayoutDto) =>
    request<Layout>('/layout', { method: 'PUT', body: JSON.stringify(dto) }),
};

export const proxyApi = {
  getGerritChanges: (params: { dataSourceId?: number; q: string; n?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.dataSourceId) searchParams.append('dataSourceId', params.dataSourceId.toString());
    searchParams.append('q', params.q);
    if (params.n) searchParams.append('n', params.n.toString());
    return request<GerritChange[]>(`/proxy/gerrit/changes?${searchParams.toString()}`);
  },
  getZuulBuilds: (params: { dataSourceId?: number; project?: string; pipeline?: string; result?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.dataSourceId) searchParams.append('dataSourceId', params.dataSourceId.toString());
    if (params.project) searchParams.append('project', params.project);
    if (params.pipeline) searchParams.append('pipeline', params.pipeline);
    if (params.result) searchParams.append('result', params.result);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    return request<ZuulBuild[]>(`/proxy/zuul/builds?${searchParams.toString()}`);
  },
  getIrcMessages: (params: { dataSourceId?: number; channel: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.dataSourceId) searchParams.append('dataSourceId', params.dataSourceId.toString());
    searchParams.append('channel', params.channel);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    return request<{ messages: IrcMessage[]; dates: string[] }>(`/proxy/irc/messages?${searchParams.toString()}`);
  },
};

export const summaryApi = {
  get: () => request<DashboardSummary>('/summary'),
};
