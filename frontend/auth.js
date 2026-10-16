const KEY = 'gym_auth';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveAuth({ token, user }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, user }));
  } catch {
  }
}

export function getToken() {
  return read()?.token ?? null;
}

export function getUser() {
  return read()?.user ?? null;
}

export function isLoggedIn() {
  return getToken() !== null;
}

export function clearAuth() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}