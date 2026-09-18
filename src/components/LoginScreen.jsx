// src/components/LoginScreen.jsx
import { useEffect, useRef, useState } from 'react';
import { useSelector } from '../context/StoreContext';
import { ALLOWED_DOMAINS, DOMAIN } from '../utils/constants';
import { usePasswordReveal } from '../hooks/usePasswordReveal';
import { Ic, ICONS } from './Icons';

const EMAIL_PLACEHOLDER = `ivanov@${DOMAIN}`;

const validateEmailFormat = (email) => {
  if (!email.trim()) return 'E-mail обязателен';
  const lower = email.trim().toLowerCase();
  if (
    !lower.includes('@') ||
    lower.startsWith('@') ||
    lower.endsWith('.') ||
    lower.includes('..')
  ) return 'Некорректный формат e-mail';
  if (!ALLOWED_DOMAINS.some(domain => lower.endsWith(domain))) {
    return 'Допускаются домены ' + ALLOWED_DOMAINS.join(', ');
  }
  return null;
};

const emailLocalPart = (email) => {
  const e = String(email || '').toLowerCase().trim();
  return e.includes('@') ? e.split('@')[0] : e;
};

const validateEmailNotTaken = (email, employees, regRequests) => {
  const formatError = validateEmailFormat(email);
  if (formatError) return formatError;
  const local = emailLocalPart(email);
  if (
    employees.some(e => e.email && emailLocalPart(e.email) === local) ||
    (regRequests || []).some(r => r.email && emailLocalPart(r.email) === local)
  ) return 'Такой e-mail уже зарегистрирован';
  return null;
};

const validateEmailExists = (email, employees) => {
  if (!email.trim()) return 'E-mail обязателен';
  const local = emailLocalPart(email);
  if (!employees.some(e => e.email && emailLocalPart(e.email) === local)) {
    return 'E-mail не найден в системе';
  }
  return null;
};

const validateForgotEmail = (email, employees) => {
  const formatError = validateEmailFormat(email);
  if (formatError) return formatError;
  return validateEmailExists(email, employees);
};

function passIssues(p) {
  return [
    { ok: p.length >= 8,                     t: 'Минимум 8 символов' },
    { ok: /[A-ZА-ЯЁ]/.test(p),               t: 'Заглавная буква' },
    { ok: /[a-zа-яё]/.test(p),               t: 'Строчная буква' },
    { ok: /\d/.test(p),                      t: 'Цифра' },
    { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(p),    t: 'Специальный символ' },
  ];
}

export default function LoginScreen({ registerEmployee, onLogin, toast }) {
  const employees   = useSelector(s => s.employees);
  const regRequests = useSelector(s => s.regRequests);

  // Таймеры: 450 мс - снять анимацию «тряски»; 30 мс - короткая задержка
  // перед onLogin, чтобы кнопка успела перейти в disabled до синхронного
  // setState выше. Оба снимаются при размонтировании: экран исчезает
  // при успешном входе, а оживший таймер трогал бы state снятого
  // компонента.
  const flashTimerRef = useRef(null);
  const loginTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(flashTimerRef.current);
    clearTimeout(loginTimerRef.current);
  }, []);

  const [mode, setMode] = useState('login');
  const [lg, setLg] = useState('');
  const [pw, setPw] = useState('');
  const { shown: showPassword, toggle: togglePasswordVisibility } = usePasswordReveal();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shake, setShake] = useState(false);
  const [reg, setReg] = useState({ first: '', last: '', email: '', pass: '', pass2: '' });
  const [emailError, setEmailError] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotTouched, setForgotTouched] = useState(false);
  const [forgot, setForgot] = useState('');
  const { shown: showRegPass, toggle: toggleRegPassVisibility } = usePasswordReveal();
  const [loginEmailError, setLoginEmailError] = useState(null);

  const flash = () => {
    setShake(true);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      setShake(false);
    }, 450);
  };
  const rejectField = () => { flash(); };
  const reject = (message) => { setErr(message); flash(); };

  const doLogin = (email, pass) => {
    const emailErr = validateEmailFormat(email);
    if (emailErr) {
      setLoginEmailError(emailErr);
      rejectField();
      return;
    }
    setBusy(true);
    setErr(null);
    clearTimeout(loginTimerRef.current);
    loginTimerRef.current = setTimeout(() => {
      loginTimerRef.current = null;
      const r = onLogin(email, pass);
      if (r) reject(r);
      setBusy(false);
    }, 30);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErr(null);
    setEmailError(null);
    setEmailTouched(false);
    setForgotError(null);
    setForgotTouched(false);
    setLoginEmailError(null);
    if (newMode === 'forgot') setForgot('');
  };

  const handleLoginEmailChange = (value) => {
    setLg(value);
    setErr(null);
    if (loginEmailError) setLoginEmailError(null);
  };

  const handleLoginEmailBlur = () => {
    if (!lg.trim()) { setLoginEmailError(null); return; }
    setLoginEmailError(validateEmailFormat(lg));
  };

  const handleEmailChange = (value, setter) => {
    setter(value);
    if (emailTouched) setEmailError(validateEmailNotTaken(value, employees, regRequests));
  };

  const handleEmailBlur = (value) => {
    setEmailTouched(true);
    if (!value.trim()) { setEmailError(null); return; }
    setEmailError(validateEmailNotTaken(value, employees, regRequests));
  };

  const handleForgotEmailChange = (value) => {
    setForgot(value);
    if (forgotTouched) setForgotError(validateForgotEmail(value, employees));
  };

  const handleForgotEmailBlur = () => {
    setForgotTouched(true);
    if (!forgot.trim()) { setForgotError(null); return; }
    setForgotError(validateForgotEmail(forgot, employees));
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (mode === 'login') {
        doLogin(lg, pw);
        return;
      }

      if (mode === 'register') {
        if (!reg.first.trim() || !reg.last.trim() || !reg.email.trim()) {
          return reject('Заполните все обязательные поля');
        }
        const emailErr = validateEmailNotTaken(reg.email, employees, regRequests);
        if (emailErr) {
          setEmailTouched(true);
          setEmailError(emailErr);
          return rejectField();
        }
        if (passIssues(reg.pass).some(i => !i.ok)) {
          return reject('Пароль не соответствует требованиям безопасности');
        }
        if (reg.pass !== reg.pass2) return reject('Пароли не совпадают');
        try {
          const email = reg.email.trim().toLowerCase();
          registerEmployee({ first: reg.first, last: reg.last, email, pass: reg.pass });
          if (toast) toast('Регистрация успешна! Выполняется вход…', 'success');
          if (!onLogin(email, reg.pass)) {
            reject('Ошибка автоматического входа после регистрации.');
          }
          setReg({ first: '', last: '', email: '', pass: '', pass2: '' });
          setEmailError(null);
          setEmailTouched(false);
          setMode('login');
        } catch (ex) {
          reject(ex.message || 'Не удалось зарегистрироваться');
        }
        return;
      }

      if (mode === 'forgot') {
        if (!forgot.trim()) {
          setForgotTouched(true);
          setForgotError('E-mail обязателен');
          return rejectField();
        }
        const forgotErr = validateForgotEmail(forgot, employees);
        if (forgotErr) {
          setForgotTouched(true);
          setForgotError(forgotErr);
          return rejectField();
        }
        if (toast) {
          toast(
            'Ссылка для восстановления пароля отправлена на ' + forgot.trim() +
            ' (действует 1 час). Заглушка.',
            'success',
          );
        }
        switchMode('login');
      }
    } catch (ex) {
      reject('Внутренняя ошибка: ' + (ex && ex.message ? ex.message : ex));
    }
  };

  const issues = passIssues(reg.pass);

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="logo lg">
          <div className="logo-mark">АП</div>
          <div>
            <div className="logo-name">АвиаГоризонт</div>
            <div className="logo-sub">планирование и учёт времени</div>
          </div>
        </div>
        <h2>Единая среда планирования ИЦ</h2>
        <p>
          Канбан, список, диаграмма Ганта и календарь. Производственные проекты
          двух типов, административные проекты, задачи с подзадачами бесконечной
          вложенности, отпуска с делегированием, HR-администрирование и журнал
          аудита.
        </p>
        <ul className="hero-list">
          <li>9 ролей, включая HR-менеджера; временное делегирование полномочий</li>
          <li>Архив закрытых задач и проектов при попадании в завершенные или отмененные</li>
          <li>Комментарии с ветками ответов и @упоминаниями участников в задачах и проектах</li>
        </ul>
        <div className="hero-stack">
          React · Vite · Node.js · PostgreSQL · Ubuntu LTS · ООП/KISS/DRY
        </div>
      </div>

      <div className="login-panel">
        <form className={'login-card' + (shake ? ' shake' : '')} onSubmit={submit}>
          {mode !== 'register' && (
            <>
              <h3>{mode === 'forgot' ? 'Восстановление пароля' : 'Вход в систему'}</h3>
              <div className="login-sub">
                {mode === 'forgot'
                  ? 'Ссылка будет отправлена на зарегистрированный e-mail'
                  : `Введите рабочий e-mail целиком, например ${EMAIL_PLACEHOLDER}`}
              </div>

              {mode === 'forgot' ? (
                <>
                  <label className="lbl">E-mail</label>
                  <input
                    className="inp"
                    type="email"
                    autoComplete="username"
                    value={forgot}
                    onChange={e => handleForgotEmailChange(e.target.value)}
                    onBlur={handleForgotEmailBlur}
                    placeholder={EMAIL_PLACEHOLDER}
                    autoFocus
                  />
                  {forgotTouched && forgotError && (
                    <div className="login-err">{forgotError}</div>
                  )}
                </>
              ) : (
                <>
                  <label className="lbl">E-mail</label>
                  <input
                    className="inp"
                    type="email"
                    autoComplete="username"
                    value={lg}
                    onChange={e => handleLoginEmailChange(e.target.value)}
                    onBlur={handleLoginEmailBlur}
                    placeholder={EMAIL_PLACEHOLDER}
                    autoFocus
                  />
                  {loginEmailError && <div className="login-err">{loginEmailError}</div>}

                  <label className="lbl">Пароль</label>
                  <div className="relative">
                    <input
                      className="inp"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={pw}
                      onChange={e => { setPw(e.target.value); setErr(null); }}
                      placeholder="с учётом регистра"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="pass-toggle-btn"
                    >
                      <Ic d={ICONS.eye} size={18} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'register' && (
            <>
              <h3>Регистрация сотрудника</h3>
              <div className="login-sub">
                После регистрации вы автоматически войдёте с ролью «Исполнитель».
                Суперадминистратор получит уведомление.
              </div>

              <div className="reg-row">
                <div>
                  <label className="lbl">Имя<span className="required-star">*</span></label>
                  <input
                    className="inp"
                    value={reg.first}
                    onChange={e => setReg({ ...reg, first: e.target.value })}
                  />
                </div>
                <div>
                  <label className="lbl">Фамилия<span className="required-star">*</span></label>
                  <input
                    className="inp"
                    value={reg.last}
                    onChange={e => setReg({ ...reg, last: e.target.value })}
                  />
                </div>
              </div>

              <label className="lbl">E-mail<span className="required-star">*</span></label>
              <input
                className="inp"
                type="email"
                autoComplete="email"
                value={reg.email}
                onChange={e =>
                  handleEmailChange(e.target.value, (v) =>
                    setReg(prev => ({ ...prev, email: v })))}
                onBlur={() => handleEmailBlur(reg.email)}
                placeholder={EMAIL_PLACEHOLDER}
              />
              {emailTouched && emailError && <div className="login-err">{emailError}</div>}

              <label className="lbl">Пароль<span className="required-star">*</span></label>
              <div className="relative">
                <input
                  className="inp"
                  type={showRegPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={reg.pass}
                  onChange={e => setReg({ ...reg, pass: e.target.value })}
                />
                <button
                  type="button"
                  onClick={toggleRegPassVisibility}
                  className="pass-toggle-btn"
                >
                  <Ic d={ICONS.eye} size={18} />
                </button>
              </div>
              <div className="pass-checks">
                {issues.map(i => (
                  <span key={i.t} className={i.ok ? 'ok' : ''}>✓ {i.t}</span>
                ))}
              </div>

              <label className="lbl">Подтверждение пароля<span className="required-star">*</span></label>
              <input
                className="inp"
                type="password"
                autoComplete="new-password"
                value={reg.pass2}
                onChange={e => setReg({ ...reg, pass2: e.target.value })}
              />
            </>
          )}

          {err && <div className="login-err">{err}</div>}

          <button className="btn primary big" type="submit" disabled={busy}>
            {busy ? 'Выполняется вход…'
              : mode === 'login' ? 'Войти'
              : mode === 'register' ? 'Зарегистрироваться'
              : 'Отправить ссылку'}
          </button>

          {mode === 'login' && (
            <>
              <div className="login-links">
                <button type="button" className="link" onClick={() => switchMode('forgot')}>
                  Забыли пароль?
                </button>
                <span className="link-sep">|</span>
                <button type="button" className="link" onClick={() => switchMode('register')}>
                  Регистрация
                </button>
              </div>
              <div className="cookie-note">
                Сессия хранится в cookie 30 дней (HttpOnly, Secure, SameSite=Lax - на стороне сервера).
              </div>
              <div className="demo-title">Демо-доступы - клик сразу выполняет вход</div>
              <div className="demo-grid">
                {[
                  { l: 'sergey.adminov@hor.ru',    p: 'Admin2026!',    t: 'Суперадминистратор' },
                  { l: 'aleksey.gendirov@hor.ru',  p: 'Director2026!', t: 'Генеральный директор' },
                  { l: 'erik.ekonomistov@hor.ru',  p: 'Econ2026!',     t: 'Главный экономист' },
                  { l: 'ivan.konstruktorov@hor.ru',p: 'KbLa2026!',     t: 'Гл. конструктор КБ «ЛА»' },
                  { l: 'olga.personalova@hor.ru',  p: 'Hr2026!',       t: 'HR-менеджер' },
                  { l: 'mikhail.otdelov@hor.ru',   p: 'Head2026!',     t: 'Руководитель отделов' },
                  { l: 'nikolay.managerov@hor.ru', p: 'Pm2026!',       t: 'Менеджер проектов' },
                  { l: 'kirill.proektov@hor.ru',   p: 'Pm2026!',       t: 'Ответственный по проекту' },
                  { l: 'isaev@hor.ru',             p: 'Exec2026!',     t: 'Исполнитель' },
                ].map(d => (
                  <button
                    key={d.l}
                    type="button"
                    className="demo-chip"
                    disabled={busy}
                    onClick={() => {
                      setLg(d.l);
                      setPw(d.p);
                      setErr(null);
                      setLoginEmailError(null);
                      doLogin(d.l, d.p);
                    }}
                  >
                    <span className="demo-login">{d.l}</span>
                    <span className="demo-role">{d.t}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode !== 'login' && (
            <div className="login-links">
              <button type="button" className="link" onClick={() => switchMode('login')}>
                ← Назад ко входу
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}