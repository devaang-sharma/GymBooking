import { api } from '../api.js';
import { getUser } from '../auth.js';
import { createStateBox, showState, el, formatTime } from '../ui.js';

const POLL_MS = 10000;
const HOUR_MS = 3600000;

export function render(container) {
  const isAdmin = getUser()?.role === 'admin';
  const busy = new Set();
  let sessions = [];
  let lastJson = '';
  let loadId = 0;
  let focusId = null;

  const h = el('h2', { tabIndex: -1, textContent: 'Sessions' });
  const dateInput = el('input', { id: 'filter-date', type: 'date' });
  const clearBtn = el('button', { type: 'button', textContent: 'Clear filter' });
  const filter = el('div', { class: 'field' },
    el('label', { htmlFor: 'filter-date', textContent: 'Filter by date' }),
    dateInput, clearBtn);
  const actionError = el('p', { class: 'error', role: 'alert', hidden: true });
  const box = createStateBox();
  const list = el('ul', { class: 'card-list' });

  // what the button does, depending on this member's relation to the session
  function actionFor(s) {
    if (s.my_status === 'booked') {
      return {
        label: 'Cancel booking',
        optimistic: (x) => { x.my_status = 'none'; x.seats_left += 1; },
        request: () => api(`/bookings/${s.my_booking_id}/cancel`, { method: 'POST' }),
      };
    }
    if (s.my_status === 'waitlisted') {
      return {
        label: 'Leave waitlist',
        optimistic: (x) => { x.my_status = 'none'; },
        request: () => api(`/sessions/${s.id}/waitlist`, { method: 'DELETE' }),
      };
    }
    if (s.seats_left > 0) {
      return {
        label: 'Book',
        primary: true,
        optimistic: (x) => { x.my_status = 'booked'; x.seats_left -= 1; },
        request: () => api(`/sessions/${s.id}/book`, { method: 'POST' }),
        done: (x, res) => { x.my_booking_id = res.id; },
      };
    }
    return {
      label: 'Join waitlist',
      optimistic: (x) => { x.my_status = 'waitlisted'; },
      request: () => api(`/sessions/${s.id}/waitlist`, { method: 'POST' }),
    };
  }

  function card(s) {
    const full = s.seats_left <= 0;
    const li = el('li', { class: 'card', 'data-session-id': s.id },
      el('h3', { textContent: formatTime(s.start_time) }),
      el('p', { textContent: full ? 'Full' : `${s.seats_left} of ${s.capacity} seats left` }));

    if (isAdmin) {
      const start = new Date(s.start_time).getTime();
      if (Date.now() >= start + HOUR_MS) li.append(el('p', { textContent: 'Ended' }));
      else if (Date.now() >= start) li.append(el('p', { textContent: 'In progress' }));
      return li;
    }

    if (s.my_status === 'booked') li.append(el('p', { textContent: 'You are booked.' }));
    if (s.my_status === 'waitlisted') li.append(el('p', { textContent: 'You are on the waitlist.' }));

    const action = actionFor(s);
    const button = el('button', {
      type: 'button',
      class: action.primary ? 'primary' : '',
      textContent: action.label,
      disabled: busy.has(s.id),
    });
    button.addEventListener('click', () => act(s, action));
    li.append(button);
    return li;
  }

  function draw() {
    const active = document.activeElement?.closest?.('[data-session-id]')?.dataset.sessionId;
    const target = focusId ?? active;

    list.replaceChildren(...sessions.map(card));
    if (sessions.length === 0) {
      showState(box, 'empty', dateInput.value ? 'No sessions on that date.' : 'No upcoming sessions.');
    } else {
      showState(box, 'success');
    }

    if (target) {
      const btn = list.querySelector(`[data-session-id="${target}"] button:not(:disabled)`);
      if (btn) { btn.focus(); focusId = null; }
    }
  }

  async function load(silent = false) {
    const id = ++loadId;
    if (!silent) {
      list.replaceChildren();
      showState(box, 'loading');
    }
    try {
      const path = dateInput.value ? `/sessions?date=${encodeURIComponent(dateInput.value)}` : '/sessions';
      const data = await api(path);
      if (id !== loadId) return;
      const json = JSON.stringify(data);
      if (silent && json === lastJson) return;
      lastJson = json;
      sessions = data;
      draw();
    } catch (err) {
      if (id !== loadId || silent) return;
      showState(box, 'error', err.message, () => load());
    }
  }

  // optimistic update: change the UI now, ask the server, roll back if it refuses
  async function act(s, action) {
    if (busy.has(s.id)) return;
    loadId++; // invalidate any in-flight load so it can't overwrite this
    actionError.hidden = true;
    const before = { ...s };
    busy.add(s.id);
    focusId = s.id;
    action.optimistic(s);
    draw();
    try {
      const res = await action.request();
      action.done?.(s, res);
    } catch (err) {
      Object.assign(s, before);
      actionError.textContent = err.message;
      actionError.hidden = false;
    } finally {
      busy.delete(s.id);
      lastJson = '';
      draw();
      focusId = null;
      load(true); // resync with the real numbers
    }
  }

  const timer = setInterval(() => {
    if (busy.size === 0 && !document.hidden) load(true);
  }, POLL_MS);

  dateInput.addEventListener('change', () => load());
  clearBtn.addEventListener('click', () => { dateInput.value = ''; load(); });

  container.replaceChildren(h, filter, actionError, box, list);
  load();

  return () => { clearInterval(timer); loadId++; };
}