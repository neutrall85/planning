import React, { useState } from 'react';
import { DOMAIN } from '../utils/constants';
import { uid } from '../utils/date';

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shake, setShake] = useState(false);
  const [reg, setReg] = useState({ first: "", last: "", email: "", pass: "", pass2: "" });
  const [forgot, setForgot] = useState("");
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
  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (mode === "login") { doLogin(lg, pw); return; }
      if (mode === "register") {
        if (!reg.first.trim() || !reg.last.trim() || !reg.email.trim()) return fail("Заполните все обязательные поля");
        if (db.employees.some((x) => x.email.toLowerCase() === reg.email.trim().toLowerCase()) || db.regRequests.some((x) => x.email.toLowerCase() === reg.email.trim().toLowerCase())) return fail("Такой e-mail уже зарегистрирован");
        if (passIssues(reg.pass).some((i) => !i.ok)) return fail("Пароль не соответствует требованиям безопасности");
        if (reg.pass !== reg.pass2) return fail("Пароли не совпадают");
        setDb((s) => ({ ...s, regRequests: [{ id: uid(), first: reg.first.trim(), last: reg.last.trim(), email: reg.email.trim().toLowerCase(), pass: reg.pass, status: "pending", ts: Date.now() }, ...s.regRequests] }));
        toast("На " + reg.email + "@" + DOMAIN + " отправлена ссылка активации (действует 24 часа). Заглушка.");
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        if (!forgot.trim()) return fail("Укажите e-mail");
        toast("Ссылка для восстановления пароля отправлена на " + forgot.trim() + "@" + DOMAIN + " (действует 1 час). Заглушка.");
        setMode("login");
      }
    } catch (ex) {
      fail("Внутренняя ошибка: " + (ex && ex.message ? ex.message : ex));
    }
  };
  const issues = passIssues(reg.pass);
  const demos = [
    { l: "admin", p: "Admin2026!", t: "Суперадминистратор" },
    { l: "kozlov", p: "Director2026!", t: "Генеральный директор" },
    { l: "lebedeva", p: "Econ2026!", t: "Главный экономист" },
    { l: "romanov", p: "KbLa2026!", t: "Гл. конструктор КБ «ЛА»" },
    { l: "nikitina", p: "Hr2026!", t: "HR-менеджер" },
    { l: "fedorov", p: "Head2026!", t: "Руководитель отделов" },
    { l: "morozov", p: "Pm2026!", t: "Ответственный по проекту" },
    { l: "isaev", p: "Exec2026!", t: "Исполнитель" },
  ];
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="logo lg"><div className="logo-mark">АП</div><div><div className="logo-name">АэроПлан</div><div className="logo-sub">планирование и учёт времени</div></div></div>
        <h2>Единая среда планирования КБ</h2>
        <p>Канбан, диаграмма Ганта и календарь. Проекты двух типов, обсуждения задач с @упоминаниями, отпуска с делегированием, HR-администрирование, архивация и журнал аудита.</p>
        <ul className="hero-list">
          <li>8 ролей, включая HR-менеджера; временное делегирование полномочий</li>
          <li>Архив закрытых задач и проектов (по умолчанию 6 месяцев, настройка 3–24)</li>
          <li>Комментарии с ветками ответов и @упоминаниями участников</li>
        </ul>
        <div className="hero-stack">React · Java (Spring Boot) · PostgreSQL · Ubuntu LTS · REST/JSON · OpenAPI · ООП/KISS/DRY</div>
      </div>
      <div className="login-panel">
        <form className={"login-card" + (shake ? " shake" : "")} onSubmit={submit}>
          {mode !== "register" && (<>
            <h3>{mode === "forgot" ? "Восстановление пароля" : "Вход в систему"}</h3>
            <div className="login-sub">{mode === "forgot" ? "Ссылка будет отправлена на зарегистрированный e-mail" : "Логин — e-mail без домена " + "@" + DOMAIN}</div>
            {mode === "forgot" ? (<>
              <label className="lbl">E-mail</label>
              <div className="email-inp"><input className="inp" value={forgot} onChange={(e) => { setForgot(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + DOMAIN}</span></div>
            </>) : (<>
              <label className="lbl">Логин (e-mail)</label>
              <div className="email-inp"><input className="inp" value={lg} onChange={(e) => { setLg(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + DOMAIN}</span></div>
              <label className="lbl">Пароль</label>
              <input className="inp" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} placeholder="с учётом регистра" />
            </>)}
          </>)}
          {mode === "register" && (<>
            <h3>Регистрация сотрудника</h3>
            <div className="login-sub">После активации заявку одобрит суперадминистратор</div>
            <div className="reg-row">
              <div><label className="lbl">Имя *</label><input className="inp" value={reg.first} onChange={(e) => setReg({ ...reg, first: e.target.value })} /></div>
              <div><label className="lbl">Фамилия *</label><input className="inp" value={reg.last} onChange={(e) => setReg({ ...reg, last: e.target.value })} /></div>
            </div>
            <label className="lbl">E-mail *</label>
            <div className="email-inp"><input className="inp" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="ivanov" /><span className="email-dom">{"@" + DOMAIN}</span></div>
            <label className="lbl">Пароль *</label>
            <input className="inp" type="password" value={reg.pass} onChange={(e) => setReg({ ...reg, pass: e.target.value })} />
            <div className="pass-checks">{issues.map((i) => <span key={i.t} className={i.ok ? "ok" : ""}>✓ {i.t}</span>)}</div>
            <label className="lbl">Подтверждение пароля *</label>
            <input className="inp" type="password" value={reg.pass2} onChange={(e) => setReg({ ...reg, pass2: e.target.value })} />
          </>)}
          {err && <div className="login-err">{err}</div>}
          <button className="btn primary big" type="submit" disabled={busy}>{busy ? "Выполняется вход…" : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}</button>
          {mode === "login" && (<>
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
          </>)}
          {mode !== "login" && <div className="login-links"><button type="button" className="link" onClick={() => { setMode("login"); setErr(null); }}>← Назад ко входу</button></div>}
        </form>
      </div>
    </div>
  );
}