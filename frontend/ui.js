const DEFAULTS = {
  loading: 'Loading...',
  empty: 'Nothing here yet.',
  error: 'Something went wrong.',
};

// A box a page puts above its content. showState fills it.
export function createStateBox() {
  const box = document.createElement('div');
  box.setAttribute('aria-live', 'polite');
  return box;
}

export function showState(box, state, message, onRetry) {
  box.replaceChildren();
  box.className = '';
  if (state === 'success') return;

  box.className = 'state';
  const p = document.createElement('p');
  p.textContent = message || DEFAULTS[state];
  box.append(p);

  if (state === 'error' && onRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Try again';
    retry.addEventListener('click', onRetry);
    box.append(retry);
  }
}

// Disables a button while an async action runs, always re-enables it.
export async function withButton(button, fn) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

export function makeField({ id, label, type = 'text', autocomplete }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const l = document.createElement('label');
  l.htmlFor = id;
  l.textContent = label;

  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  if (autocomplete) input.autocomplete = autocomplete;

  wrap.append(l, input);
  return { wrap, input };
}

export function clearFieldError(input) {
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
  const next = input.nextElementSibling;
  if (next && next.classList.contains('error')) next.remove();
}

export function setFieldError(input, message) {
  clearFieldError(input);
  const p = document.createElement('p');
  p.className = 'error';
  p.id = `${input.id}-error`;
  p.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', p.id);
  input.after(p);
}

// tiny DOM builder: el('p', { textContent: 'hi', class: 'x' }, child1, 'text')
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
});

export function formatTime(iso) {
  return timeFmt.format(new Date(iso));
}