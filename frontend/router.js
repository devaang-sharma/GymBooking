import { getUser, clearAuth } from './auth.js';
import * as loginPage from './pages/login.js';
import * as sessionsPage from './pages/sessions.js';
import * as bookingsPage from './pages/bookings.js';
import * as adminPage from './pages/admin.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

// access: 'public' | 'auth' (any logged-in user) | 'member' | 'admin'
const routes = {
  '/login':    { page: loginPage,    access: 'public', title: 'Log in' },
  '/sessions': { page: sessionsPage, access: 'auth',   title: 'Sessions' },
  '/bookings': { page: bookingsPage, access: 'member', title: 'My bookings' },
  '/admin':    { page: adminPage,    access: 'admin',  title: 'Admin' },
};

let cleanup = null;

function allowed(access, user) {
  if (access === 'public') return true;
  if (!user) return false;
  if (access === 'auth') return true;
  return user.role === access;
}

function homeFor(user) {
  if (!user) return '/login';
  return user.role === 'admin' ? '/admin' : '/sessions';
}

function redirect(path) {
  location.replace('#' + path);
}

function renderNav(user, path) {
  nav.replaceChildren();
  if (!user) return;

  const links = [['/sessions', 'Sessions']];
  links.push(user.role === 'admin' ? ['/admin', 'Admin'] : ['/bookings', 'My bookings']);

  for (const [p, label] of links) {
    const a = document.createElement('a');
    a.href = '#' + p;
    a.textContent = label;
    if (p === path) a.setAttribute('aria-current', 'page');
    nav.append(a);
  }

  const out = document.createElement('button');
  out.type = 'button';
  out.textContent = 'Log out';
  out.addEventListener('click', () => {
    clearAuth();
    location.hash = '#/login';
  });
  nav.append(out);
}

function handleRoute() {
  const path = location.hash.slice(1);
  const route = routes[path];
  const user = getUser();

  if (!route) return redirect(homeFor(user));
  if (!allowed(route.access, user)) return redirect(homeFor(user));
  if (path === '/login' && user) return redirect(homeFor(user));

  if (cleanup) cleanup();
  cleanup = null;

  renderNav(user, path);
  document.title = `${route.title} - Gym Booking`;
  cleanup = route.page.render(app) ?? null;
  app.querySelector('h2')?.focus();
}

window.addEventListener('hashchange', handleRoute);
handleRoute();  