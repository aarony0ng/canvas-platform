const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.detail ?? 'Request failed'), { status: res.status })
  return data
}

export const api = {
  get:    (path)         => request('GET', path),
  post:   (path, body)   => request('POST', path, body),
  put:    (path, body)   => request('PUT', path, body),
  patch:  (path, body)   => request('PATCH', path, body),
  delete: (path)         => request('DELETE', path),

  auth: {
    me:             ()     => api.get('/auth/me'),
    signup:         (body) => api.post('/auth/signup', body),
    login:          (body) => api.post('/auth/login', body),
    logout:         ()     => api.post('/auth/logout'),
    verifyEmail:    (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
    forgotPassword: (body) => api.post('/auth/forgot-password', body),
    deleteAccount:  ()     => api.delete('/auth/account'),
  },

  token: {
    status: ()     => api.get('/token'),
    save:   (body) => api.put('/token', body),
    remove: ()     => api.delete('/token'),
  },

  prefs: {
    get:          ()     => api.get('/preferences'),
    update:       (body) => api.patch('/preferences', body),
    toggleCourse: (body) => api.post('/preferences/courses/toggle', body),
  },

  assignments: {
    upcoming: () => api.get('/assignments/upcoming'),
  },
}
