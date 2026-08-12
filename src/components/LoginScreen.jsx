import React, { useState, useRef } from 'react';
import { Ic, ICONS } from './Icons';
import { validateRegistration, sanitizeObject } from '../utils/validation';
import { logger } from '../utils/logging/logger';
import { COMPANY_DOMAIN, SHAKE_ANIMATION_MS, PASSWORD_AUTO_HIDE_MS } from '../utils/config';
import { uid } from '../utils/date';

/**
 * Валидация пароля
 * @param {string} p - пароль для проверки
 * @returns {Array<{ok: boolean, t: string}>} массив проверок
 */
function passIssues(p) {
  return [
    { ok: p.length >= 8, t: "Минимум 8 символов" },
    { ok: /[A-ZА-ЯЁ]/.test(p), t: "Заглавная буква" },
    { ok: /[a-zа-яё]/.test(p), t: "Строчная буква" },
    { ok: /\d/.test(p), t: "Цифра" },
    { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(p), t: "Специальный символ" },
  ];
}

export default function LoginScreen({ db, onLogin, toast, store }) {
  const [mode, setMode] = useState("login");
  const [lg, setLg] = useState("");
  const [pw, setPw] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passTimer, setPassTimer] = useState(null);
  const passTimerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shake, setShake] = useState(false);
  const [reg, setReg] = useState({ first: "", last: "", email: "", pass: "", pass2: "" });
  const [forgot, setForgot] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const passwordTimerRef = useRef(null);

  const [showRegPass, setShowRegPass] = useState(false);
  const regPassTimerRef = useRef(null);

  const fail = (m) => { setErr(m); setShake(true); setTimeout(() => setShake(false), 450); };
  const doLogin = (loginVal, passVal) => {
    setBusy(true);
    setErr(null);
    setTimeout(() => {
      try {
        const r = onLogin(loginVal, passVal);
        if (r) fail(r);
      } catch (ex) {
        console.error('Login error:', ex);
        fail('Произошла ошибка при входе. Попробуйте позже.');
      }
      setBusy(false);
    }, 30);
  };

  const togglePasswordVisibility = () => {
    if (showPassword) {
      setShowPassword(false);
      if (passwordTimerRef.current) {
        clearTimeout(passwordTimerRef.current);
        passwordTimerRef.current = null;
      }
    } else {
      setShowPassword(true);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = setTimeout(() => {
        setShowPassword(false);
        passwordTimerRef.current = null;
      }, 10000);
    }
  };

  const toggleRegPassVisibility = () => {
    if (showRegPass) {
      setShowRegPass(false);
      if (regPassTimerRef.current) {
        clearTimeout(regPassTimerRef.current);
        regPassTimerRef.current = null;
      }
    } else {
      setShowRegPass(true);
      if (regPassTimerRef.current) clearTimeout(regPassTimerRef.current);
      regPassTimerRef.current = setTimeout(() => {
        setShowRegPass(false);
        regPassTimerRef.current = null;
      }, 10000);
    }
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (mode === "login") { 
        // Валидация входных данных перед отправкой
        if (!lg.trim() || !pw.trim()) {
          return fail("Заполните все поля");
        }
        doLogin(lg, pw); 
        return; 
      }
      if (mode === "register") {
        // Санитизация входных данных
        const sanitizedReg = sanitizeObject(reg);
        
        // Глубокая валидация через Zod схему
        const validation = validateRegistration({
          first: sanitizedReg.first,
          last: sanitizedReg.last,
          email: sanitizedReg.email,
          pass: sanitizedReg.pass,
          pass2: sanitizedReg.pass2,
        });
        
        if (!validation.success) {
          logger.warn('Валидация регистрации не пройдена', validation.errors);
          const firstError = validation.errors[0];
          return fail(firstError.message || "Ошибка валидации");
        }
        
        // Проверка на существующий email
        if (db.employees.some((x) => x.email.toLowerCase() === sanitizedReg.email.trim().toLowerCase()) || 
            db.regRequests.some((x) => x.email.toLowerCase() === sanitizedReg.email.trim().toLowerCase())) {
          logger.info(`Попытка регистрации с существующим email: ${sanitizedReg.email}`);
          return fail("Такой e-mail уже зарегистрирован");
        }

        const newEmployee = {
          id: "e_" + uid(),
          last: sanitizedReg.last.trim(),
          first: sanitizedReg.first.trim(),
          email: sanitizedReg.email.trim().toLowerCase(),
          pass: sanitizedReg.pass,
          position: "Сотрудник",
          departments: [],
          roles: ["executor"],
          kbIds: [],
          headDeptIds: [],
          phone: "",
          extension: "",
          tab: String(1000 + Math.floor(Math.random() * 8999)),
          notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
          failed: 0,
          lockUntil: 0,
          fired: false,
          photo: null
        };
        
        logger.info(`Новая регистрация: ${newEmployee.email}`, { empId: newEmployee.id });
        
        // Используем публичный API store
        if (store && typeof store.registerEmployee === 'function') {
          store.registerEmployee(sanitizedReg);
        } else {
          // Fallback для обратной совместимости
          store.setData({
            ...db,
            employees: [...db.employees, newEmployee],
            notifications: [
              { id: uid(), userId: "sergey.adminov", text: `Новая регистрация: ${newEmployee.last} ${newEmployee.first}`, ts: Date.now(), read: false, targetType: null, targetId: null },
              ...db.notifications
            ]
          });
        }
        toast("Регистрация успешна! Выполняется вход...");
        const loginOk = onLogin(sanitizedReg.email.trim().toLowerCase(), sanitizedReg.pass);
        if (!loginOk) {
          logger.error('Ошибка автоматического входа после регистрации', { email: sanitizedReg.email });
          fail("Ошибка автоматического входа после регистрации.");
        }
        setReg({ first: "", last: "", email: "", pass: "", pass2: "" });
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        if (!forgot.trim()) return fail("Укажите e-mail");
        logger.info(`Запрос восстановления пароля для: ${forgot.trim()}`);
        toast("Ссылка для восстановления пароля отправлена на " + forgot.trim() + "@" + COMPANY_DOMAIN + " (действует 1 час). Заглушка.");
        setMode("login");
      }
    } catch (ex) {
      logger.errorWithStack(ex, 'Ошибка в форме входа/регистрации', { mode, lg, reg: { ...reg, pass: '[REDACTED]', pass2: '[REDACTED]' } });
      fail("Внутренняя ошибка: " + (ex && ex.message ? ex.message : ex));
    }
  };
  const issues = passIssues(reg.pass);

  const demos = [
    { l: "sergey.adminov", p: "Admin2026!", t: "Суперадминистратор" },
    { l: "aleksey.gendirov", p: "Director2026!", t: "Генеральный директор" },
    { l: "erik.ekonomistov", p: "Econ2026!", t: "Главный экономист" },
    { l: "ivan.konstruktorov", p: "KbLa2026!", t: "Гл. конструктор КБ «ЛА»" },
    { l: "petr.konstruktorov", p: "KbAd2026!", t: "Гл. конструктор КБ АД" },
    { l: "olga.personalova", p: "Hr2026!", t: "HR-менеджер" },
    { l: "mikhail.otdelov", p: "Head2026!", t: "Руководитель отделов" },
    { l: "nikolay.managerov", p: "Pm2026!", t: "Менеджер проектов" },
    { l: "kirill.proektov", p: "Pm2026!", t: "Ответственный по проекту" },
    { l: "isaev", p: "Exec2026!", t: "Исполнитель" }
  ];

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="logo lg"><div className="logo-mark">АП</div><div><div className="logo-name">План/Факт VDE</div><div className="logo-sub">планирование и учёт времени</div></div></div>
        <h2>Единая среда планирования организации</h2>
        <p>Канбан, диаграмма Ганта и календарь. Проекты двух типов, обсуждения задач с @упоминаниями, отпуска с делегированием, HR-администрирование, архивация и журнал.</p>
        <ul className="hero-list">
          <li>9 ролей, включая HR-менеджера; временное делегирование полномочий</li>
          <li>Архив закрытых задач и проектов</li>
          <li>Комментарии с ветками ответов и @упоминаниями участников</li>
        </ul>
        <div className="hero-stack">React · Node.js · PostgreSQL · Ubuntu LTS · REST/JSON · OpenAPI · ООП/KISS/DRY</div>
      </div>
      <div className="login-panel">
        <form className={"login-card" + (shake ? " shake" : "")} onSubmit={submit}>
          {mode !== "register" && (
            <>
              <h3>{mode === "forgot" ? "Восстановление пароля" : "Вход в систему"}</h3>
              <div className="login-sub">{mode === "forgot" ? "Ссылка будет отправлена на зарегистрированный e-mail" : "Логин — e-mail без домена " + "@" + COMPANY_DOMAIN}</div>
              {mode === "forgot" ? (
                <>
                  <label className="lbl">E-mail</label>
                  <div className="email-inp"><input className="inp" value={forgot} onChange={(e) => { setForgot(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + COMPANY_DOMAIN}</span></div>
                </>
              ) : (
                <>
                  <label className="lbl">Логин (e-mail)</label>
                  <div className="email-inp"><input className="inp" value={lg} onChange={(e) => { setLg(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + COMPANY_DOMAIN}</span></div>
                  <label className="lbl">Пароль</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inp"
                      type={showPassword ? "text" : "password"}
                      value={pw}
                      onChange={(e) => { setPw(e.target.value); setErr(null); }}
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

          {mode === "register" && (
            <>
              <h3>Регистрация сотрудника</h3>
              <div className="login-sub">После регистрации вы автоматически войдёте с ролью «Исполнитель». Суперадминистратор получит уведомление.</div>
              <div className="reg-row">
                <div><label className="lbl">Имя *</label><input className="inp" value={reg.first} onChange={(e) => setReg({ ...reg, first: e.target.value })} /></div>
                <div><label className="lbl">Фамилия *</label><input className="inp" value={reg.last} onChange={(e) => setReg({ ...reg, last: e.target.value })} /></div>
              </div>
              <label className="lbl">E-mail *</label>
              <div className="email-inp"><input className="inp" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="ivanov" /><span className="email-dom">{"@" + COMPANY_DOMAIN}</span></div>
              <label className="lbl">Пароль *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="inp"
                  type={showRegPass ? "text" : "password"}
                  value={reg.pass}
                  onChange={(e) => setReg({ ...reg, pass: e.target.value })}
                />
                <button
                  type="button"
                  onClick={toggleRegPassVisibility}
                  className="pass-toggle-btn"
                >
                  <Ic d={ICONS.eye} size={18} />
                </button>
              </div>
              <div className="pass-checks">{issues.map((i) => <span key={i.t} className={i.ok ? "ok" : ""}>✓ {i.t}</span>)}</div>
              <label className="lbl">Подтверждение пароля *</label>
              <input className="inp" type="password" value={reg.pass2} onChange={(e) => setReg({ ...reg, pass2: e.target.value })} />
            </>
          )}

          {err && <div className="login-err">{err}</div>}
          <button className="btn primary big" type="submit" disabled={busy}>{busy ? "Выполняется вход…" : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}</button>

          {mode === "login" && (
            <>
              <div className="login-links">
                <button type="button" className="link" onClick={() => { setMode("forgot"); setErr(null); }}>Забыли пароль?</button>
                <button type="button" className="link" onClick={() => { setMode("register"); setErr(null); }}>Регистрация</button>
              </div>
              <div className="cookie-note">Сессия хранится в cookie 30 дней (HttpOnly, Secure, SameSite=Lax — на стороне сервера).</div>
              <div className="demo-title">Демо-доступы — клик сразу выполняет вход</div>
              <div className="demo-grid">
                {demos.map((d) => (
                  <button type="button" key={d.l} className="demo-chip" onClick={() => { setLg(d.l); setPw(d.p); setErr(null); doLogin(d.l, d.p); }}>
                    <span className="demo-login">{d.l}</span><span className="demo-role">{d.t}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode !== "login" && <div className="login-links"><button type="button" className="link" onClick={() => { setMode("login"); setErr(null); }}>← Назад ко входу</button></div>}
        </form>
      </div>
    </div>
  );
}