import { API_URL } from './config.js';
import { getToken, clearAuth } from './auth.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // body was not JSON
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearAuth();
      location.hash = '#/login';
    }
    const e = data?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'UNKNOWN_ERROR',
      e?.message ?? 'Something went wrong',
      e?.details
    );
  }

  return data;
}