const BASE_URL = '';

export async function fetchJson(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    let errMessage = 'Request failed';
    try {
      const err = await res.json();
      errMessage = err.detail || err.message || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Dashboard & Overview
  getOverview: () => fetchJson('/api/marks/overview'),

  // Students & Settings
  getStudents: () => fetchJson('/api/students'),
  updateStudent: (id, data) => fetchJson(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getSharedPasswordStatus: () => fetchJson('/api/settings/shared-password'),
  setSharedPassword: (shared_password) => fetchJson('/api/settings/shared-password', {
    method: 'POST',
    body: JSON.stringify({ shared_password }),
  }),
  testStudentLogin: (id, data = {}) => fetchJson(`/api/students/${id}/test-login`, {
    method: 'POST',
    body: JSON.stringify({ student_id: id, ...data }),
  }),

  // Marks Retrieval & Automation
  fetchAllMarks: () => fetchJson('/api/marks/fetch-all', { method: 'POST' }),
  refreshStudent: (id) => fetchJson(`/api/marks/refresh/${id}`, { method: 'POST' }),
  
  // Table & History
  getTableData: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return fetchJson(`/api/marks/table?${search}`);
  },
  getStudentHistory: (id) => fetchJson(`/api/marks/history/${id}`),

  // Analytics
  getAnalyticsSummary: () => fetchJson('/api/analytics/summary'),
  getStudentTrend: (id) => fetchJson(`/api/analytics/student-trend/${id}`),
  compareStudents: (idA, idB) => fetchJson(`/api/analytics/compare/${idA}/${idB}`),

  // Mobile & Network Info
  getMobileInfo: () => fetchJson('/api/mobile/info'),

  // Export URLs
  getExportUrl: (format = 'xlsx', scope = 'all', studentId = null) => {
    let url = `/api/marks/export?format=${format}&scope=${scope}`;
    if (studentId) url += `&student_id=${studentId}`;
    return url;
  },
  getBackupExportUrl: () => '/api/backup/export',
  restoreBackup: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to restore backup');
    return res.json();
  },

  // SSE Live Progress Connection
  subscribeProgress: (onMessage, onError) => {
    const evtSource = new EventSource('/api/marks/fetch-all/stream');
    evtSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };
    evtSource.onerror = (err) => {
      if (onError) onError(err);
    };
    return () => evtSource.close();
  }
};
