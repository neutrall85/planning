import React, { useState, useRef } from 'react';
import { DOMAIN } from '../utils/constants';
import { uid } from '../utils/date';
import { Ic, ICONS } from './Icons';

// ===== Вспомогательные функции (DRY, KISS) =====
const ALLOWED_DOMAINS = ["@hor.ru", "@zont.ru", "@horizont.ru"];

const validateEmailFormat = (email) => {
  if (!email.trim()) return "E-mail обязателен";
  const lower = email.trim().toLowerCase();
  if (!lower.includes("@") || lower.startsWith("@") || lower.endsWith(".") || lower.includes("..")) {
    return "Некорректный формат e-mail";
  }
  if (!ALLOWED_DOMAINS.some(domain => lower.endsWith(domain))) {
    return "Допускаются домены " + ALLOWED_DOMAINS.join(', ');
  }
  return null;
};

// Проверка существования email в базе (имитация)
const validateEmailExists = (email, employees) => {
  if (!email.trim()) return "E-mail обязателен";
  const lower = email.trim().toLowerCase();
  const exists = employees.some(e => e.email && e.email.toLowerCase() === lower);
  if (!exists) return "E-mail не найден в системе";
  return null;
};

// Комбинированная проверка для восстановления: сначала формат, потом существование
const validateForgotEmail = (email, employees) => {
  const formatError = validateEmailFormat(email);
  if (formatError) return formatError;
  return validateEmailExists(email, employees);
};

function passIssues(p) {
  return [
    { ok: p.length >= 8, t: "Минимум 8 символов" },
    { ok: /[A-ZА-ЯЁ]/.test(p), t: "Заглавная буква" },
    { ok: /[a-zа-яё]/.test(p), t: "Строчная буква" },
    { ok: /\d/.test(p), t: "Цифра" },
    { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(p), t: "Специальный символ" },
  ];
}

export default function LoginScreen({ db, setDb, onLogin, toast }) {
  const [mode, setMode] = useState("login");
  const [lg, setLg] = useState("");
  const [pw, setPw] = useState("");
  const [showPass, setShowPass] = useState(false);
  const passTimerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shake, setShake] = useState(false);
  const [reg, setReg] = useState({ first: "", last: "", email: "", pass: "", pass2: "" });
  
  // Состояния для валидации email в регистрации
  const [emailError, setEmailError] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);
  
  // Состояния для валидации email в восстановлении
  const [forgotError, setForgotError] = useState(null);
  const [forgotTouched, setForgotTouched] = useState(false);
  
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
      const r = onLogin(loginVal, passVal);
      if (r) fail(r);
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

  // Сброс состояний валидации при переключении режима
  const switchMode = (newMode) => {
    setMode(newMode);
    setErr(null);
    setEmailError(null);
    setEmailTouched(false);
    setForgotError(null);
    setForgotTouched(false);
  };

  // Универсальный обработчик изменений для поля email регистрации (DRY)
  const handleEmailChange = (value, setter) => {
    setter(value);
    if (emailTouched) {
      setEmailError(validateEmailFormat(value));
    }
  };

  const handleEmailBlur = (value) => {
    setEmailTouched(true);
    setEmailError(validateEmailFormat(value));
  };

  // Обработчики для поля восстановления
  const handleForgotEmailChange = (value) => {
    setForgot(value);
    if (forgotTouched) {
      setForgotError(validateForgotEmail(value, db.employees));
    }
  };

  const handleForgotEmailBlur = () => {
    setForgotTouched(true);
    setForgotError(validateForgotEmail(forgot, db.employees));
  };

  // Проверка заполненности формы регистрации (для кнопки)
  const isRegFormValid = () => {
    if (!reg.first.trim() || !reg.last.trim()) return false;
    if (validateEmailFormat(reg.email)) return false; // есть ошибка
    if (db.employees.some(e => e.email && e.email.toLowerCase() === reg.email.trim().toLowerCase())) return false; // email занят
    if (!passIssues(reg.pass).every(i => i.ok)) return false;
    if (reg.pass !== reg.pass2) return false;
    return true;
  };

  // Проверка заполненности формы восстановления
  const isForgotFormValid = () => {
    return !validateForgotEmail(forgot, db.employees); // возвращает true, если ошибки нет
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (mode === "login") { doLogin(lg, pw); return; }
      if (mode === "register") {
        if (!reg.first.trim() || !reg.last.trim() || !reg.email.trim()) return fail("Заполните все обязательные поля");
        
        const email = reg.email.trim().toLowerCase();
        if (!ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
            return fail("Недопустимый домен e-mail");
        }

        if (db.employees.some((x) => x.email && x.email.toLowerCase() === email) || db.regRequests.some((x) => x.email && x.email.toLowerCase() === email)) return fail("Такой e-mail уже зарегистрирован");
        if (passIssues(reg.pass).some((i) => !i.ok)) return fail("Пароль не соответствует требованиям безопасности");
        if (reg.pass !== reg.pass2) return fail("Пароли не совпадают");

        const newEmployee = {
          id: "e_" + uid(),
          last: reg.last.trim(),
          first: reg.first.trim(),
          email: reg.email.trim().toLowerCase(),
          pass: reg.pass,
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
        setDb((s) => ({
          ...s,
          employees: [...s.employees, newEmployee],
          notifications: [
            { id: uid(), userId: "sergey.adminov", text: `Новая регистрация: ${newEmployee.last} ${newEmployee.first}`, ts: Date.now(), read: false, targetType: null, targetId: null },
            ...s.notifications
          ]
        }));
        toast("Регистрация успешна! Выполняется вход...");
        const loginOk = onLogin(reg.email.trim().toLowerCase(), reg.pass);
        if (!loginOk) {
          fail("Ошибка автоматического входа после регистрации.");
        }
        setReg({ first: "", last: "", email: "", pass: "", pass2: "" });
        setEmailError(null);
        setEmailTouched(false);
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        if (!forgot.trim()) return fail("Укажите e-mail");
        // Финальная проверка на сервере
        if (validateForgotEmail(forgot, db.employees)) return fail(validateForgotEmail(forgot, db.employees));
        toast("Ссылка для восстановления пароля отправлена на " + forgot.trim() + " (действует 1 час). Заглушка.");
        switchMode("login");
      }
    } catch (ex) {
      fail("Внутренняя ошибка: " + (ex && ex.message ? ex.message : ex));
    }
  };
  const issues = passIssues(reg.pass);

  const demos = [
    { l: "sergey.adminov", p: "Admin2026!", t: "Суперадминистратор" },
    { l: "aleksey.gendirov", p: "Director2026!", t: "Генеральный директор" },
    { l: "erik.ekonomistov", p: "Econ2026!", t: "Главный экономист" },
    { l: "ivan.konstruktorov", p: "KbLa2026!", t: "Гл. конструктор КБ «ЛА»" },
    { l: "olga.personalova", p: "Hr2026!", t: "HR-менеджер" },
    { l: "mikhail.otdelov", p: "Head2026!", t: "Руководитель отделов" },
    { l: "nikolay.managerov", p: "Pm2026!", t: "Менеджер проектов" },
    { l: "kirill.proektov", p: "Pm2026!", t: "Ответственный по проекту" },
    { l: "isaev", p: "Exec2026!", t: "Исполнитель" }
  ];

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="logo lg"><div className="logo-mark">АП</div><div><div className="logo-name">АвиаГоризонт</div><div className="logo-sub">планирование и учёт времени</div></div></div>
        <h2>Единая среда планирования ИЦ</h2>
        <p>Канбан, список, диаграмма Ганта и календарь. Производственные проекты двух типов, административные проекты, задачи с подзадачами бесконечной вложенности, отпуска с делегированием, HR-администрирование и журнал аудита.</p>
        <ul className="hero-list">
          <li>9 ролей, включая HR-менеджера; временное делегирование полномочий</li>
          <li>Архив закрытых задач и проектов при попадании в завершенные или отмененные</li>
          <li>Комментарии с ветками ответов и @упоминаниями участников в задачах и проектах</li>
        </ul>
        <div className="hero-stack">React · Vite · Node.js · PostgreSQL · Ubuntu LTS · ООП/KISS/DRY</div>
      </div>
      <div className="login-panel">
        <form className={"login-card" + (shake ? " shake" : "")} onSubmit={submit}>
          {mode !== "register" && (
            <>
              <h3>{mode === "forgot" ? "Восстановление пароля" : "Вход в систему"}</h3>
              <div className="login-sub">{mode === "forgot" ? "Ссылка будет отправлена на зарегистрированный e-mail" : "Логин — e-mail без домена " + "@" + DOMAIN}</div>
              {mode === "forgot" ? (
                <>
                  <label className="lbl">E-mail</label>
                  <div className="email-inp">
                    <input 
                      className="inp" 
                      value={forgot} 
                      onChange={(e) => handleForgotEmailChange(e.target.value)} 
                      onBlur={handleForgotEmailBlur}
                      placeholder="ivanov@hor.ru" 
                      autoFocus 
                    />
                  </div>
                  {/* Отображение ошибки email восстановления */}
                  {forgotTouched && forgotError && <div className="login-err">{forgotError}</div>}
                </>
              ) : (
                <>
                  <label className="lbl">Логин (e-mail)</label>
                  <div className="email-inp"><input className="inp" value={lg} onChange={(e) => { setLg(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + DOMAIN}</span></div>
                  <label className="lbl">Пароль</label>
                  <div className="relative">
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
              <div className="email-inp">
                  <input 
                    className="inp" 
                    value={reg.email} 
                    onChange={(e) => handleEmailChange(e.target.value, (v) => setReg(prev => ({ ...prev, email: v })))} 
                    onBlur={() => handleEmailBlur(reg.email)}
                    placeholder="ivanov@hor.ru" 
                  />
              </div>
              {emailTouched && emailError && <div className="login-err">{emailError}</div>}
              
              <label className="lbl">Пароль *</label>
              <div className="relative">
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
          <button className="btn primary big" type="submit" disabled={busy || (mode === "register" && !isRegFormValid()) || (mode === "forgot" && !isForgotFormValid())}>
            {busy ? "Выполняется вход…" : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}
          </button>

          {mode === "login" && (
            <>
              <div className="login-links">
                <button type="button" className="link" onClick={() => switchMode("forgot")}>Забыли пароль?</button>
                <span className="link-sep">|</span>
                <button type="button" className="link" onClick={() => switchMode("register")}>Регистрация</button>
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

          {mode !== "login" && <div className="login-links"><button type="button" className="link" onClick={() => switchMode("login")}>← Назад ко входу</button></div>}
        </form>
      </div>
    </div>
  );
}