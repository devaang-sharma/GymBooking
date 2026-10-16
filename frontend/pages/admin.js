import { api } from '../api.js';
import {
  createStateBox, showState, withButton, makeField,
  setFieldError, clearFieldError, el, formatTime,
} from '../ui.js';

export function render(container) {
  const h = el('h2', { tabIndex: -1, textContent: 'Admin' });

  // shared: the session picker
  const select = el('select', { id: 'pick-session' });
  const sessionsBox = createStateBox();
  const bookingsBox = createStateBox();
  const tableWrap = el('div', { class: 'table-wrap' });
  let reqId = 0;

  async function loadSessions() {
    const keep = select.value;
    showState(sessionsBox, 'loading');
    try {
      const data = await api('/sessions');
      select.replaceChildren(
        el('option', { value: '', textContent: 'Choose a session' }),
        ...data.map((s) => el('option', {
          value: String(s.id),
          textContent: `${formatTime(s.start_time)} (${s.capacity - s.seats_left}/${s.capacity} booked)`,
        }))
      );
      select.value = keep;
      showState(sessionsBox, data.length ? 'success' : 'empty', 'No sessions yet. Create one above.');
    } catch (err) {
      showState(sessionsBox, 'error', err.message, loadSessions);
    }
  }

  function bookingsTable(rows) {
    const head = el('tr', {}, ...['Name', 'Email', 'Status', 'Present'].map((t) => el('th', { scope: 'col', textContent: t })));
    const body = rows.map((b) => el('tr', {},
      el('td', { textContent: b.name }),
      el('td', { textContent: b.email }),
      el('td', { textContent: b.status === 'confirmed' ? 'Confirmed' : 'Cancelled' }),
      el('td', { textContent: b.checked_in_at ? `Yes, ${formatTime(b.checked_in_at)}` : b.status === 'confirmed' ? 'Not yet' : '-' })
    ));
    return el('table', {}, el('thead', {}, head), el('tbody', {}, ...body));
  }

  async function loadBookings() {
    const id = select.value;
    tableWrap.replaceChildren();
    if (!id) {
      showState(bookingsBox, 'empty', 'Choose a session to see its bookings.');
      return;
    }
    const mine = ++reqId;
    showState(bookingsBox, 'loading');
    try {
      const rows = await api(`/sessions/${id}/bookings`);
      if (mine !== reqId) return;
      if (rows.length === 0) {
        showState(bookingsBox, 'empty', 'No bookings for this session.');
        return;
      }
      showState(bookingsBox, 'success');
      tableWrap.replaceChildren(bookingsTable(rows));
    } catch (err) {
      if (mine === reqId) showState(bookingsBox, 'error', err.message, loadBookings);
    }
  }

  // ---- 1. create a session
  const dateF = makeField({ id: 'new-date', label: 'Date', type: 'date' });
  const hourSelect = el('select', { id: 'new-hour' },
    el('option', { value: '', textContent: 'Choose hour' }),
    ...Array.from({ length: 24 }, (_, i) =>
      el('option', { value: String(i), textContent: `${String(i).padStart(2, '0')}:00` })));
  const hourWrap = el('div', { class: 'field' },
    el('label', { htmlFor: 'new-hour', textContent: 'Start hour' }), hourSelect);
  const createError = el('p', { class: 'error', role: 'alert', hidden: true });
  const createOk = el('p', { class: 'notice', role: 'status', hidden: true });
  const createBtn = el('button', { type: 'submit', class: 'primary', textContent: 'Create session' });
  const createForm = el('form', { noValidate: true }, createError, dateF.wrap, hourWrap, createBtn);

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    [dateF.input, hourSelect].forEach(clearFieldError);
    createError.hidden = true;
    createOk.hidden = true;

    let first = null;
    if (!dateF.input.value) { setFieldError(dateF.input, 'Choose a date'); first = dateF.input; }
    if (hourSelect.value === '') { setFieldError(hourSelect, 'Choose a start hour'); first ??= hourSelect; }
    if (first) { first.focus(); return; }

    try {
      const s = await withButton(createBtn, () =>
        api('/sessions', { method: 'POST', body: { date: dateF.input.value, hour: Number(hourSelect.value) } }));
      createOk.textContent = `Created session for ${formatTime(s.start_time)}.`;
      createOk.hidden = false;
      await loadSessions();
    } catch (err) {
      const fields = { date: dateF.input, hour: hourSelect };
      if (err.details?.length) {
        for (const d of err.details) if (fields[d.field]) setFieldError(fields[d.field], d.message);
      } else {
        createError.textContent = err.message;
        createError.hidden = false;
      }
    }
  });

  // ---- 2. bookings of a session
  const refreshBtn = el('button', { type: 'button', textContent: 'Refresh bookings' });
  select.addEventListener('change', loadBookings);
  refreshBtn.addEventListener('click', loadBookings);

  // ---- 3. check-in
  const codeF = makeField({ id: 'code', label: 'Check-in code', autocomplete: 'off' });
  codeF.input.maxLength = 6;
  codeF.input.setAttribute('autocapitalize', 'characters');
  const checkError = el('p', { class: 'error', role: 'alert', hidden: true });
  const checkOk = el('p', { class: 'notice', role: 'status', hidden: true });
  const checkBtn = el('button', { type: 'submit', class: 'primary', textContent: 'Mark present' });
  const checkForm = el('form', { noValidate: true }, checkError, codeF.wrap, checkBtn);

  checkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldError(codeF.input);
    checkError.hidden = true;
    checkOk.hidden = true;

    const code = codeF.input.value.trim();
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      setFieldError(codeF.input, 'The code is 6 letters or digits');
      codeF.input.focus();
      return;
    }

    try {
      const r = await withButton(checkBtn, () => api('/checkin', { method: 'POST', body: { code } }));
      checkOk.textContent = `Marked present: ${r.name} (${r.email})`;
      checkOk.hidden = false;
      codeF.input.value = '';
      if (String(r.session_id) === select.value) loadBookings();
    } catch (err) {
      if (err.details?.length) setFieldError(codeF.input, err.details[0].message);
      else {
        checkError.textContent = err.message;
        checkError.hidden = false;
      }
    }
    codeF.input.focus();
  });

  container.replaceChildren(
    h,
    el('section', {}, el('h3', { textContent: 'Create a session' }), createForm, createOk),
    el('section', {},
      el('h3', { textContent: 'Session bookings' }),
      el('div', { class: 'field' }, el('label', { htmlFor: 'pick-session', textContent: 'Session' }), select),
      sessionsBox, refreshBtn, bookingsBox, tableWrap),
    el('section', {}, el('h3', { textContent: 'Check in a member' }), checkForm, checkOk)
  );

  loadSessions();
  loadBookings();
}