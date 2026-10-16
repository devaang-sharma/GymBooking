import { api } from '../api.js';
import { saveAuth } from '../auth.js';
import { makeField, setFieldError, clearFieldError, withButton } from '../ui.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function render(container) {
  let mode = 'login';

  const h = document.createElement('h2');
  h.tabIndex = -1;

  const form = document.createElement('form');
  form.noValidate = true;

  const formError = document.createElement('p');
  formError.className = 'error';
  formError.setAttribute('role', 'alert');
  formError.hidden = true;

  const nameField = makeField({ id: 'name', label: 'Name', autocomplete: 'name' });
  const emailField = makeField({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' });
  const passwordField = makeField({ id: 'password', label: 'Password', type: 'password' });

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'primary';

  const toggle = document.createElement('button');
  toggle.type = 'button';

  const inputs = {
    name: nameField.input,
    email: emailField.input,
    password: passwordField.input,
  };

  function clearAll() {
    formError.hidden = true;
    formError.textContent = '';
    Object.values(inputs).forEach(clearFieldError);
  }

  function setMode(next) {
    mode = next;
    const register = mode === 'register';
    h.textContent = register ? 'Create account' : 'Log in';
    submit.textContent = register ? 'Create account' : 'Log in';
    toggle.textContent = register ? 'I already have an account' : 'Create a new account';
    nameField.wrap.hidden = !register;
    passwordField.input.autocomplete = register ? 'new-password' : 'current-password';
    clearAll();
  }

  function validate() {
    let first = null;
    const fail = (input, msg) => {
      setFieldError(input, msg);
      first ??= input;
    };

    if (mode === 'register') {
      const name = inputs.name.value.trim();
      if (!name) fail(inputs.name, 'Name is required');
      else if (name.length > 100) fail(inputs.name, 'Name must be at most 100 characters');
    }

    if (!EMAIL_RE.test(inputs.email.value.trim())) {
      fail(inputs.email, 'Enter a valid email address');
    }

    const pw = inputs.password.value;
    if (mode === 'register') {
      if (pw.length < 8) fail(inputs.password, 'Password must be at least 8 characters');
      else if (pw.length > 72) fail(inputs.password, 'Password must be at most 72 characters');
    } else if (!pw) {
      fail(inputs.password, 'Password is required');
    }

    first?.focus();
    return first === null;
  }

  function showError(err) {
    if (err.details?.length) {
      for (const d of err.details) {
        if (inputs[d.field]) setFieldError(inputs[d.field], d.message);
      }
      inputs[err.details[0].field]?.focus();
      return;
    }
    if (err.code === 'EMAIL_TAKEN') {
      setFieldError(inputs.email, err.message);
      inputs.email.focus();
      return;
    }
    formError.textContent = err.message;
    formError.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAll();
    if (!validate()) return;

    const email = inputs.email.value.trim();
    const password = inputs.password.value;

    try {
      await withButton(submit, async () => {
        if (mode === 'register') {
          await api('/auth/register', {
            method: 'POST',
            body: { name: inputs.name.value.trim(), email, password },
          });
        }
        const result = await api('/auth/login', { method: 'POST', body: { email, password } });
        saveAuth(result);
        location.hash = result.user.role === 'admin' ? '#/admin' : '#/sessions';
      });
    } catch (err) {
      showError(err);
    }
  });

  toggle.addEventListener('click', () => {
    setMode(mode === 'login' ? 'register' : 'login');
    h.focus();
  });

  form.append(formError, nameField.wrap, emailField.wrap, passwordField.wrap, submit);
  container.replaceChildren(h, form, toggle);
  setMode('login');
}