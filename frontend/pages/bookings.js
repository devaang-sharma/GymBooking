import { api } from '../api.js';
import { createStateBox, showState, withButton, el, formatTime } from '../ui.js';

const POLL_MS = 15000;
const HOUR_MS = 3600000;

export function render(container) {
  let lastJson = '';
  let loadId = 0;
  let pending = 0;

  const h = el('h2', { tabIndex: -1, textContent: 'My bookings' });
  const actionError = el('p', { class: 'error', role: 'alert', hidden: true });
  const box = createStateBox();
  const upcomingH = el('h3', { textContent: 'Upcoming', hidden: true });
  const upcomingList = el('ul', { class: 'card-list' });
  const pastH = el('h3', { textContent: 'Past and cancelled', hidden: true });
  const pastList = el('ul', { class: 'card-list' });

  function statusText(b) {
    if (b.status === 'cancelled') return 'Cancelled';
    if (b.checked_in_at) return 'Attended';
    return 'Did not attend';
  }

  async function onCancel(button, b) {
    actionError.hidden = true;
    pending++;
    try {
      await withButton(button, () => api(`/bookings/${b.id}/cancel`, { method: 'POST' }));
    } catch (err) {
      actionError.textContent = err.message;
      actionError.hidden = false;
    } finally {
      pending--;
      lastJson = '';
      load(true);
    }
  }

  function activeCard(b) {
    const li = el('li', { class: 'card' },
      el('h4', { textContent: formatTime(b.start_time) }),
      el('p', {}, 'Check-in code: ', el('strong', { class: 'code', textContent: b.checkin_code })));
    if (Date.now() < new Date(b.start_time).getTime()) {
      const cancel = el('button', { type: 'button', textContent: 'Cancel booking' });
      cancel.addEventListener('click', () => onCancel(cancel, b));
      li.append(cancel);
    } else {
      li.append(el('p', { textContent: 'In progress. Show your code to the admin.' }));
    }
    return li;
  }

  function pastCard(b) {
    return el('li', { class: 'card' },
      el('h4', { textContent: formatTime(b.start_time) }),
      el('p', { textContent: statusText(b) }));
  }

  function draw(bookings) {
    const now = Date.now();
    const active = bookings
      .filter((b) => b.status === 'confirmed' && new Date(b.start_time).getTime() + HOUR_MS > now)
      .reverse(); // soonest first
    const rest = bookings.filter((b) => !active.includes(b));

    upcomingList.replaceChildren(...active.map(activeCard));
    pastList.replaceChildren(...rest.map(pastCard));
    upcomingH.hidden = active.length === 0;
    pastH.hidden = rest.length === 0;
    showState(box, bookings.length ? 'success' : 'empty', 'You have no bookings yet. Book one from the Sessions page.');
  }

  async function load(silent = false) {
    const id = ++loadId;
    if (!silent) {
      upcomingList.replaceChildren();
      pastList.replaceChildren();
      upcomingH.hidden = true;
      pastH.hidden = true;
      showState(box, 'loading');
    }
    try {
      const data = await api('/bookings/mine');
      if (id !== loadId) return;
      const json = JSON.stringify(data);
      if (silent && json === lastJson) return;
      lastJson = json;
      draw(data);
    } catch (err) {
      if (id !== loadId || silent) return;
      showState(box, 'error', err.message, () => load());
    }
  }

  const timer = setInterval(() => {
    if (pending === 0 && !document.hidden) load(true);
  }, POLL_MS);

  container.replaceChildren(h, actionError, box, upcomingH, upcomingList, pastH, pastList);
  load();

  return () => { clearInterval(timer); loadId++; };
}