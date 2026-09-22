import { iso, addDays, uid } from '../utils/date';

export function buildMockData() {
  const D = (off) => iso(addDays(new Date(), off));
  const now = Date.now();
  const makeDate = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return iso(d);
  };

  const settings = { archiveMonths: 6 };

  const kbs = [
    { id: "kb_la", name: "КБ «ЛА»", full: "Конструкторское бюро летательных аппаратов" },
    { id: "kb_ad", name: "КБ «АД»", full: "Конструкторское бюро авиационных двигателей" },
  ];

  const departments = [
    { id: "d_aero", name: "Отдел аэродинамики", kbId: "kb_la" },
    { id: "d_strla", name: "Отдел прочности", kbId: "kb_la" },
    { id: "d_comp", name: "Отдел компоновки и весовых балансов", kbId: "kb_la" },
    { id: "d_gas", name: "Отдел газодинамики", kbId: "kb_ad" },
    { id: "d_stren", name: "Отдел прочности двигателей", kbId: "kb_ad" },
    { id: "d_sau", name: "Отдел систем автоматического управления", kbId: "kb_ad" },
    { id: "d_av1", name: "ОБРЭО", kbId: "kb_la" },
    { id: "d_otk", name: "ОКК ИЦ", kbId: null },
    { id: "d_hr", name: "Отдел управления персоналом", kbId: null },
    { id: "d_management", name: "Группа управления и развития", kbId: null },
  ];

  const employees = [
    { id: "sergey.adminov", last: "Админов", first: "Сергей", email: "sergey.adminov", pass: "Admin2026!", position: "Администратор системы", departments: [{ deptId: "d_otk", primary: true }], roles: ["admin"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "101", tab: "1001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "aleksey.gendirov", last: "Гендиров", first: "Алексей", email: "aleksey.gendirov", pass: "Director2026!", position: "Генеральный директор", departments: [], roles: ["director"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "102", tab: "1002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "erik.ekonomistov", last: "Экономистов", first: "Эрик", email: "erik.ekonomistov", pass: "Econ2026!", position: "Главный экономист", departments: [{ deptId: "d_management", primary: true }], roles: ["economist"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "103", tab: "1003", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "ivan.konstruktorov", last: "Конструкторов", first: "Иван", email: "ivan.konstruktorov", pass: "KbLa2026!", position: "Главный конструктор КБ «ЛА»", departments: [], roles: ["kb_chief", "executor"], kbIds: ["kb_la"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "104", tab: "1004", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_belova", last: "Белова", first: "Наталья", email: "belova", pass: "KbAd2026!", position: "Главный конструктор КБ «АД»", departments: [], roles: ["kb_chief", "executor"], kbIds: ["kb_ad"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "105", tab: "1005", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "olga.personalova", last: "Персоналова", first: "Ольга", email: "olga.personalova", pass: "Hr2026!", position: "Руководитель отдела управления персоналом", departments: [{ deptId: "d_hr", primary: true }], roles: ["hr", "head", "executor"], kbIds: [], headDeptIds: ["d_hr"], phone: "+7 900 000-00-00", extension: "106", tab: "1006", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "mikhail.otdelov", last: "Отделов", first: "Михаил", email: "mikhail.otdelov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }, { deptId: "d_comp", primary: false }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "kirill.proektov", last: "Проектов", first: "Кирилл", email: "kirill.proektov", pass: "Pm2026!", position: "Инженер", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "nikolay.managerov", last: "Менеджеров", first: "Николай", email: "nikolay.managerov", pass: "Pm2026!", position: "Менеджер проектов", departments: [{ deptId: "d_av1", primary: true }], roles: ["project_manager", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "117", tab: "1017", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_otk_head", last: "Отков", first: "Олег", email: "otk.head", pass: "Head2026!", position: "Руководитель отдела контроля качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_otk"], phone: "+7 900 000-00-00", extension: "201", tab: "2001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_otk_spec", last: "Специалистов", first: "Сергей", email: "otk.spec", pass: "Exec2026!", position: "Специалист по контролю качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "202", tab: "2002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "isaev", last: "Исаев", first: "Роман", email: "isaev", pass: "Exec2026!", position: "Инженер-аэродинамик", departments: [{ deptId: "d_aero", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "118", tab: "1018", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_fedorov", last: "Фёдоров", first: "Игорь", email: "fedorov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_gromov", last: "Громов", first: "Сергей", email: "gromov", pass: "Head2026!", position: "Начальник отдела прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_strla"], phone: "+7 900 000-00-00", extension: "108", tab: "1008", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_ilina", last: "Ильина", first: "Анна", email: "ilina", pass: "Exec2026!", position: "Ведущий инженер-компоновщик", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "109", tab: "1009", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_krylov", last: "Крылов", first: "Виктор", email: "krylov", pass: "Head2026!", position: "Начальник отдела газодинамики", departments: [{ deptId: "d_gas", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_gas"], phone: "+7 900 000-00-00", extension: "110", tab: "1010", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_medvedev", last: "Медведев", first: "Павел", email: "medvedev", pass: "Head2026!", position: "Начальник отдела прочности двигателей", departments: [{ deptId: "d_stren", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_stren"], phone: "+7 900 000-00-00", extension: "111", tab: "1011", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_orlova", last: "Орлова", first: "Елена", email: "orlova", pass: "Head2026!", position: "Начальник отдела САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_sau"], phone: "+7 900 000-00-00", extension: "112", tab: "1012", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_morozov", last: "Морозов", first: "Константин", email: "morozov", pass: "Pm2026!", position: "Ведущий инженер", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_zaitsev", last: "Зайцев", first: "Алексей", email: "zaitsev", pass: "Exec2026!", position: "Инженер по прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "119", tab: "1019", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_frolova", last: "Фролова", first: "Дарья", email: "frolova", pass: "Exec2026!", position: "Инженер-расчётчик", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "120", tab: "1020", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_tolka", last: "Толкачёва", first: "Ирина", email: "tolkacheva", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "121", tab: "1021", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_gusev", last: "Гусев", first: "Максим", email: "gusev", pass: "Exec2026!", position: "Инженер по весам", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "122", tab: "1022", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_tihonov", last: "Тихонов", first: "Егор", email: "tihonov", pass: "Exec2026!", position: "Инженер-газодинамик", departments: [{ deptId: "d_gas", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "123", tab: "1023", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_melnik", last: "Мельник", first: "Светлана", email: "melnik", pass: "Exec2026!", position: "Инженер по ресурсу", departments: [{ deptId: "d_stren", primary: true }, { deptId: "d_gas", primary: false }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "124", tab: "1024", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_koval", last: "Ковальчук", first: "Пётр", email: "kovalchuk", pass: "Exec2026!", position: "Инженер-программист САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "125", tab: "1025", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_somova", last: "Сомова", first: "Екатерина", email: "somova", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "126", tab: "1026", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_anokhin", last: "Анохин", first: "Сергей", email: "anokhin", pass: "Exec2026!", position: "Инженер по ОБРЭО", departments: [{ deptId: "d_av1", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "127", tab: "1027", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
  ];

  /**
   * Проект может относиться к нескольким подразделениям. Массив unitIds
   * хранит id КБ (kb_*) или id отдела вне КБ (d_*). У производственного
   * проекта это КБ - от этого зависят правила видимости главного
   * конструктора (см. kbChiefOwnsProject в permissions). У
   * административного проекта допустимы и отделы прямого подчинения.
   */
  const projects = [
    {
      id: "p_lm24", code: "ЛМ-24", name: "Лёгкий многоцелевой самолёт ЛМ-24",
      desc: "ОКР по созданию лёгкого многоцелевого самолёта.",
      unitIds: ["kb_la"], managerId: "e_morozov", start: D(-25), end: D(50),
      status: "active", budget: 300, color: "#0ea5e9", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Минобороны РФ", aircraftType: "Су-57",
      projectType: "Модификация", stage: "Рабочая документация", priority: "AOG",
      comments: [], history: [{ ts: now - 86400000 * 10, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_cert", code: "СЕРТ-24", name: "Сертификация самолёта ЛМ-24",
      desc: "Комплекс сертификационных работ.",
      unitIds: ["kb_la"], managerId: "e_fedorov", start: D(-10), end: D(45),
      status: "active", budget: 90, color: "#8b5cf6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Росавиация", aircraftType: "Су-57",
      projectType: "Модификация", stage: "Испытания", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 9, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_heli", code: "В-112", name: "Модернизация вертолёта В-112",
      desc: "Модернизация планера и систем.",
      unitIds: ["kb_la"], managerId: "e_gromov", start: D(-30), end: D(35),
      status: "active", budget: 120, color: "#f43f5e", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ВКС РФ", aircraftType: "Ка-52",
      projectType: "Ремонт", stage: "Изготовление", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 8, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_rd900", code: "РД-900", name: "Турбовинтовой двигатель РД-900",
      desc: "Перспективный ТВД.",
      unitIds: ["kb_ad"], managerId: "e_krylov", start: D(-20), end: D(60),
      status: "active", budget: 200, color: "#f59e0b", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ОАК", aircraftType: "Ил-76",
      projectType: "Модификация", stage: "Эскизный проект", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 7, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_apu", code: "ВСУ-14", name: "Вспомогательная силовая установка ВСУ-14",
      desc: "ВСУ для ЛМ-24.",
      unitIds: ["kb_ad"], managerId: "e_medvedev", start: D(-12), end: D(30),
      status: "active", budget: 70, color: "#10b981", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Минобороны РФ", aircraftType: "Су-57",
      projectType: "Ремонт", stage: "Рабочая документация", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 6, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_obr", code: "ОБРЭО-01", name: "Модернизация бортового оборудования",
      desc: "Замена аналоговых систем на цифровые.",
      unitIds: [], managerId: "nikolay.managerov", start: D(-5), end: D(20),
      status: "active", budget: 150, color: "#f97316", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "nikolay.managerov", customer: "Ростех", aircraftType: "МиГ-35",
      projectType: "Модификация", stage: "Эскизный проект", priority: "AOG",
      comments: [], history: [{ ts: now - 86400000 * 5, who: "nikolay.managerov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_event", code: "АДМ-1", name: "Внутренние мероприятия предприятия",
      desc: "Административный проект: организационные работы и мероприятия.",
      unitIds: [], managerId: "", start: D(-5), end: null,
      status: "active", budget: null, color: "#14b8a6", ptype: "admin",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Сдача", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 4, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_old", code: "ИТ-15", name: "Модернизация локальной сети предприятия",
      desc: "Проект завершён более полугода назад - подлежит архивации.",
      unitIds: [], managerId: "e_morozov", start: D(-300), end: D(-230),
      status: "closed", budget: 120, color: "#94a3b8", ptype: "prod",
      archived: true, archivedAt: D(-215), closedAt: D(-215),
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Ремонт", stage: "Сдача", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 300, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_long", code: "АДМ-0", name: "Многолетняя программа внутренних мероприятий",
      desc: "Долгосрочный административный проект - исключение из архивации.",
      unitIds: [], managerId: "olga.personalova", start: D(-400), end: null,
      status: "closed", budget: null, color: "#f59e0b", ptype: "admin", longterm: true,
      archived: false, archivedAt: null, closedAt: D(-300),
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Сдача", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 400, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_aero", code: "АЭРО-24", name: "Аэродинамические исследования ЛМ-24",
      desc: "Исследования аэродинамических характеристик самолёта.",
      unitIds: ["kb_la"], managerId: "mikhail.otdelov", start: D(-10), end: D(30),
      status: "active", budget: 80, color: "#f97316", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Минобороны РФ", aircraftType: "Су-57",
      projectType: "Модификация", stage: "Испытания", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 3, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_proch", code: "ПРОЧ-24", name: "Прочностные испытания планера",
      desc: "Статические и усталостные испытания.",
      unitIds: ["kb_la"], managerId: "e_gromov", start: D(-5), end: D(20),
      status: "active", budget: 100, color: "#8b5cf6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ВКС РФ", aircraftType: "Су-57",
      projectType: "Модификация", stage: "Изготовление", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 2, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_sau", code: "САУ-24", name: "Система управления двигателем РД-900",
      desc: "Разработка цифровой системы управления.",
      unitIds: ["kb_ad"], managerId: "e_orlova", start: D(-2), end: D(25),
      status: "active", budget: 120, color: "#14b8a6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ОАК", aircraftType: "Ил-76",
      projectType: "Модификация", stage: "Эскизный проект", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 1, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_obr_sw", code: "ОБРЭО-ПО", name: "Разработка ПО для ОБРЭО",
      desc: "Программное обеспечение для бортового оборудования.",
      unitIds: ["kb_la"], managerId: "nikolay.managerov", start: D(0), end: D(30),
      status: "active", budget: 90, color: "#0ea5e9", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "nikolay.managerov", customer: "Ростех", aircraftType: "МиГ-35",
      projectType: "Модификация", stage: "Рабочая документация", priority: "CRIT",
      comments: [], history: [{ ts: now, who: "nikolay.managerov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_portal", code: "ПОРТ-24", name: "Внутренний портал сотрудника",
      desc: "Административный проект по созданию портала.",
      unitIds: [], managerId: "olga.personalova", start: D(-20), end: D(40),
      status: "active", budget: null, color: "#f59e0b", ptype: "admin",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Эскизный проект", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 2, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_bp", code: "БП-24", name: "Оптимизация бизнес-процессов",
      desc: "Анализ и оптимизация процессов.",
      unitIds: [], managerId: "erik.ekonomistov", start: D(-15), end: D(15),
      status: "active", budget: null, color: "#f43f5e", ptype: "admin",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Рабочая документация", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 1, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_eng", code: "ИНЖ-01", name: "Инженерный стенд полунатурного моделирования",
      desc: "Стенд для отработки САУ и бортового ПО.",
      unitIds: ["kb_ad"], managerId: "e_orlova", start: D(-15), end: D(45),
      status: "active", budget: 160, color: "#8b5cf6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ОАК", aircraftType: "Ил-76",
      projectType: "КС", stage: "Эскизный проект", priority: "AOG",
      comments: [], history: [{ ts: now - 86400000 * 15, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_material", code: "МАТ-25", name: "Композитные материалы для планера ЛМ-24",
      desc: "Разработка и сертификация новых ПКМ.",
      unitIds: ["kb_la"], managerId: "e_gromov", start: D(-40), end: D(70),
      status: "active", budget: 220, color: "#14b8a6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Минобороны РФ", aircraftType: "Су-57",
      projectType: "КС", stage: "Эскизный проект", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 40, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_recon", code: "БЛА-С", name: "Разведывательный БЛА среднего класса",
      desc: "ОКР по созданию разведывательного БЛА.",
      unitIds: ["kb_la"], managerId: "mikhail.otdelov", start: D(-22), end: D(80),
      status: "active", budget: 260, color: "#0ea5e9", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Минобороны РФ", aircraftType: "Другой",
      projectType: "Модификация", stage: "Эскизный проект", priority: "AOG",
      comments: [], history: [{ ts: now - 86400000 * 22, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_energy", code: "ЭНЕР-25", name: "Система электроснабжения нового поколения",
      desc: "Разработка СЭС повышенной мощности.",
      unitIds: ["kb_ad"], managerId: "e_medvedev", start: D(-12), end: D(50),
      status: "active", budget: 140, color: "#f97316", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Ростех", aircraftType: "МиГ-35",
      projectType: "Модификация", stage: "Рабочая документация", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 12, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_train", code: "УЧБ-01", name: "Программа обучения инженеров-конструкторов",
      desc: "Внутренняя программа повышения квалификации.",
      unitIds: [], managerId: "olga.personalova", start: D(-8), end: D(60),
      status: "active", budget: null, color: "#f59e0b", ptype: "admin",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "olga.personalova", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Рабочая документация", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 8, who: "olga.personalova", text: "Проект создан" }], files: [],
    },
    {
      id: "p_safety", code: "БЕЗ-25", name: "Программа производственной безопасности",
      desc: "Мероприятия по охране труда и технике безопасности.",
      unitIds: [], managerId: "sergey.adminov", start: D(-30), end: D(90),
      status: "active", budget: null, color: "#ef4444", ptype: "admin",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "sergey.adminov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "Модификация", stage: "Сдача", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 30, who: "sergey.adminov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_quality", code: "КАЧ-25", name: "Внедрение системы менеджмента качества",
      desc: "Подготовка к сертификации СМК по ISO 9001.",
      unitIds: [], managerId: "e_otk_head", start: D(-18), end: D(75),
      status: "active", budget: 60, color: "#3b82f6", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "ООО «ВДИ»", aircraftType: "Другой",
      projectType: "КС", stage: "Рабочая документация", priority: "NORM",
      comments: [], history: [{ ts: now - 86400000 * 18, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
    {
      id: "p_export", code: "ЭКСП-25", name: "Экспортная поддержка ЛМ-24",
      desc: "Адаптация документации и обучение зарубежных партнёров.",
      unitIds: ["kb_la"], managerId: "e_fedorov", start: D(-5), end: D(55),
      status: "active", budget: 80, color: "#ec4899", ptype: "prod",
      archived: false, archivedAt: null, closedAt: null,
      creatorId: "aleksey.gendirov", customer: "Ростех", aircraftType: "Су-57",
      projectType: "Модификация", stage: "Эскизный проект", priority: "CRIT",
      comments: [], history: [{ ts: now - 86400000 * 5, who: "aleksey.gendirov", text: "Проект создан" }], files: [],
    },
  ];

  const T = (id, title, projectId, assigneeId, planned, s, dl, status, priority, desc, extra = {}) => {
    const history = extra.history || [{ ts: now - 86400000 * 6, who: extra.creatorId || "aleksey.gendirov", text: "Задача создана" }];
    const creatorId = extra.creatorId || (history.length > 0 ? history[0].who : "aleksey.gendirov");
    const startDate = makeDate(s);
    const deadlineDate = dl !== null ? makeDate(dl) : null;
    const createdAtDate = new Date(startDate);
    createdAtDate.setDate(createdAtDate.getDate() + Math.floor(Math.random() * 11) - 5);
    const createdAtStr = createdAtDate.toISOString();
    return {
      id, title, desc: desc || "", projectId,
      assigneeId: assigneeId || null,
      plannedHours: planned,
      start: startDate,
      deadline: deadlineDate,
      status,
      priority,
      logs: extra.logs || [],
      comments: extra.comments || [],
      history,
      creatorId,
      createdAt: extra.createdAt || createdAtStr,
      delegatedFrom: extra.delegatedFrom || null,
      archived: extra.archived || false,
      archivedAt: extra.archivedAt || null,
      closedAt: extra.closedAt || null,
      isSummary: extra.isSummary || false,
      parentTaskId: extra.parentTaskId || null,
      files: extra.files || [],
      dependencyId: extra.dependencyId || null,
      dependencyType: extra.dependencyType || 'FS',
    };
  };

  const tasks = [
    T("t01", "Расчёт подъёмной силы крыла", "p_lm24", "isaev", 24, -12, 6, "inwork", "high", "Расчёт и оформление отчёта.", {
      logs: [ { id: uid(), userId: "isaev", date: makeDate(-6), hours: 6, note: "Проверка методики" }, { id: uid(), userId: "isaev", date: makeDate(-2), hours: 5, note: "Расчётная сетка" } ],
      comments: [ { id: "c1", parentId: null, authorId: "e_morozov", ts: now - 3600000 * 20, text: "@Исаев Роман - подключите, пожалуйста, отдел прочности к пятнице." }, { id: "c2", parentId: "c1", authorId: "isaev", ts: now - 3600000 * 18, text: "Принято, сегодня подготовлю исходные данные." } ],
      creatorId: "e_morozov"
    }),
    T("t01_sub1", "Подзадача 1: Расчёт подъёмной силы (детализация)", "p_lm24", "isaev", 8, -10, 0, "inwork", "mid", "Детальный расчёт по сечениям.", { parentTaskId: "t01", creatorId: "e_morozov" }),
    T("t01_sub2", "Подзадача 2: Оформление отчёта по крылу", "p_lm24", "isaev", 4, -5, 5, "new", "low", "Графики и пояснительная записка.", { parentTaskId: "t01", creatorId: "e_morozov" }),

    T("t02", "3D-модель фюзеляжа", "p_lm24", "e_tolka", 40, -15, 12, "inwork", "mid", "Силовой набор и обводы.", {
      logs: [ { id: uid(), userId: "e_tolka", date: makeDate(-5), hours: 8, note: "Шпангоуты" } ],
      creatorId: "e_morozov"
    }),
    T("t03", "Нагрузки на элероны", "p_lm24", "e_zaitsev", 16, -10, -2, "new", "crit", "Эпюры нагрузок для навесок.", { creatorId: "e_morozov" }),
    T("t04", "Отчёт по прочности фюзеляжа", "p_lm24", "e_frolova", 32, -8, 18, "review", "high", "Статика и усталость.", {
      logs: [ { id: uid(), userId: "e_frolova", date: makeDate(-3), hours: 12, note: "МКЭ-модель" } ],
      creatorId: "e_morozov"
    }),
    T("t05", "Весовая сводка компоновки", "p_lm24", "e_gusev", 20, -5, 9, "inwork", "mid", "", {
      logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-1), hours: 4, note: "Сведение таблиц" } ],
      creatorId: "e_morozov"
    }),
    T("t06", "Программа лётных испытаний", "p_cert", "e_fedorov", 16, -2, 25, "new", "mid", "Совместно с лётной службой.", { creatorId: "e_fedorov" }),
    T("t07", "Согласование плана статиспытаний", "p_cert", "e_anokhin", 12, -4, 4, "inwork", "high", "", {
      logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-2), hours: 3, note: "Замечания" } ],
      creatorId: "e_fedorov"
    }),
    T("t08", "Чертежи лопастей несущего винта", "p_heli", "e_somova", 36, -18, 20, "inwork", "high", "Переназначено на период отпуска Сомовой.", {
      delegatedFrom: "e_somova",
      logs: [ { id: uid(), userId: "e_somova", date: makeDate(-7), hours: 10, note: "Комлевая часть" } ],
      creatorId: "e_gromov"
    }),
    T("t08_sub1", "Подзадача 1: Чертежи комлевой части лопасти", "p_heli", "e_somova", 10, -15, 10, "inwork", "high", "Деталировка комлевой части.", { parentTaskId: "t08", creatorId: "e_gromov" }),
    T("t08_sub2", "Подзадача 2: Прочностной расчёт лопастей", "p_heli", "e_somova", 8, -8, 2, "review", "high", "Расчёт на прочность.", { parentTaskId: "t08", creatorId: "e_gromov" }),

    T("t09", "Вибрационный расчёт главного редуктора", "p_heli", "isaev", 18, -6, 14, "new", "mid", "", { creatorId: "e_gromov" }),
    T("t10", "Термогазодинамический расчёт компрессора", "p_rd900", "e_tihonov", 48, -14, 28, "inwork", "crit", "Режимы взлёт/крейсер.", {
      logs: [ { id: uid(), userId: "e_tihonov", date: makeDate(-4), hours: 12, note: "Характеристики ступеней" } ],
      creatorId: "e_krylov"
    }),
    T("t11", "Прочность камеры сгорания", "p_rd900", "e_medvedev", 30, -9, 22, "inwork", "mid", "", {
      logs: [ { id: uid(), userId: "e_medvedev", date: makeDate(-3), hours: 6, note: "Теплонапряжённость" } ],
      creatorId: "e_krylov"
    }),
    T("t12", "ТЗ на САУ-900", "p_rd900", "e_orlova", 20, -7, 10, "review", "mid", "", {
      logs: [ { id: uid(), userId: "e_orlova", date: makeDate(-2), hours: 8, note: "Разделы 3–5" } ],
      creatorId: "e_krylov"
    }),
    T("t13", "Компрессор ВСУ-14", "p_apu", "e_tihonov", 22, -4, 16, "new", "mid", "", { creatorId: "e_medvedev" }),
    T("t14", "Испытания стартер-генератора ВСУ", "p_apu", "e_gusev", 14, -12, -4, "inwork", "high", "Стенд №3, протокол.", {
      logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-6), hours: 6, note: "Прогон на стенде" } ],
      creatorId: "e_medvedev"
    }),
    T("t15", "Разработка ТЗ на новое радиооборудование", "p_obr", "e_anokhin", 30, -3, 15, "inwork", "high", "Требования к дальности и помехозащищённости.", { creatorId: "nikolay.managerov" }),
    T("t16", "Тестирование прототипа приемника", "p_obr", "e_anokhin", 20, 2, 18, "new", "mid", "", { creatorId: "nikolay.managerov" }),
    T("t17", "Интеграция с бортовой шиной", "p_obr", "e_anokhin", 24, 5, 25, "new", "mid", "", { creatorId: "nikolay.managerov" }),
    T("t18", "Подготовка зала ко Дню промышленности", "p_event", "olga.personalova", null, 0, 6, "new", "mid", "", { creatorId: "olga.personalova" }),
    T("t19", "Заказать сувенирную продукцию", "p_event", "olga.personalova", 6, 1, 10, "new", "low", "", { creatorId: "olga.personalova" }),
    T("t_a1", "Монтаж оборудования точек доступа", "p_old", "e_anokhin", 30, -290, -240, "closed", "mid", "Завершено в прошлом отчётном периоде.", {
      logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-250), hours: 28, note: "Монтаж и пусконаладка" } ],
      closedAt: D(-215),
      comments: [ { id: "ca1", parentId: null, authorId: "e_morozov", ts: now - 86400000 * 220, text: "Прошу зафиксировать итоговую схему размещения точек." }, { id: "ca2", parentId: "ca1", authorId: "e_anokhin", ts: now - 86400000 * 218, text: "Схема приложена к отчёту, всё смонтировано." } ],
      creatorId: "e_morozov"
    }),
    T("t_a2", "Аудит сетевых кабелей", "p_old", "e_morozov", 18, -280, -235, "closed", "low", "", {
      logs: [ { id: uid(), userId: "e_morozov", date: makeDate(-240), hours: 16, note: "Аудит завершён" } ],
      closedAt: D(-220),
      creatorId: "e_morozov"
    }),
    T("t_a3", "Подготовка регламента мероприятий", "p_long", "olga.personalova", 10, -320, -305, "closed", "low", "Задача долгосрочного административного проекта - не архивируется.", {
      logs: [ { id: uid(), userId: "olga.personalova", date: makeDate(-310), hours: 9, note: "Регламент готов" } ],
      closedAt: D(-300),
      creatorId: "olga.personalova"
    }),
    T("t20", "Аудит качества сборки", "p_lm24", "sergey.adminov", 12, -8, 5, "new", "high", "Проверка соответствия технологии."),
    T("t21", "Утверждение стратегии развития", "p_bp", "aleksey.gendirov", 8, -5, 10, "new", "high", "Подготовка и утверждение стратегии."),
    T("t22", "Анализ плановых часов проектов", "p_bp", "erik.ekonomistov", 16, -3, 12, "inwork", "mid", "Сравнение плановых и фактических затрат.", {
      logs: [ { id: uid(), userId: "erik.ekonomistov", date: makeDate(-2), hours: 8, note: "Сбор данных" } ]
    }),
    T("t23", "Руководство проектированием крыла", "p_lm24", "ivan.konstruktorov", 20, -10, 15, "inwork", "crit", "Общее руководство конструкторской группой."),
    T("t24", "Расчёт газодинамики двигателя", "p_rd900", "e_belova", 30, -12, 20, "new", "high", "Расчёт параметров рабочего процесса."),
    T("t25", "Координация аэродинамических расчётов", "p_aero", "mikhail.otdelov", 18, -5, 10, "inwork", "mid", "Сведение результатов.", {
      logs: [ { id: uid(), userId: "mikhail.otdelov", date: makeDate(-2), hours: 6, note: "Совещание" } ]
    }),
    T("t26", "Планирование испытаний", "p_cert", "kirill.proektov", 14, -4, 8, "new", "mid", "Разработка программы испытаний."),
    T("t27", "Управление проектом ОБРЭО", "p_obr", "nikolay.managerov", 24, -3, 15, "inwork", "high", "Координация работ по проекту.", {
      logs: [ { id: uid(), userId: "nikolay.managerov", date: makeDate(-1), hours: 6, note: "План-график" } ]
    }),
    T("t28", "Контроль качества сборки", "p_lm24", "e_otk_head", 16, -6, 4, "new", "high", "Входной контроль комплектующих."),
    T("t29", "Проверка документации", "p_lm24", "e_otk_spec", 12, -4, 2, "new", "mid", "Проверка конструкторской документации."),
    T("t31", "Термогазодинамика РД-900", "p_rd900", "e_krylov", 26, -10, 18, "inwork", "crit", "Термодинамические расчёты.", {
      logs: [ { id: uid(), userId: "e_krylov", date: makeDate(-3), hours: 12, note: "Моделирование" } ]
    }),
    T("t32", "Планирование прочностных испытаний", "p_proch", "e_gromov", 14, -2, 6, "new", "mid", "План испытаний планера."),
    T("t33", "Компоновка отсеков", "p_lm24", "e_ilina", 20, -8, 10, "inwork", "mid", "Размещение оборудования.", {
      logs: [ { id: uid(), userId: "e_ilina", date: makeDate(-1), hours: 4, note: "Эскизы" } ]
    }),
    T("t34", "Программирование САУ", "p_sau", "e_koval", 40, -6, 20, "new", "high", "Разработка ПО для управления двигателем."),
    T("t35", "Расчёт ресурса лопаток", "p_rd900", "e_melnik", 24, -9, 14, "inwork", "mid", "Усталостный расчёт.", {
      logs: [ { id: uid(), userId: "e_melnik", date: makeDate(-4), hours: 10, note: "Нагрузки" } ]
    }),

    T("t36", "Аэродинамический расчёт БЛА-С", "p_recon", "isaev", 32, -10, 25, "inwork", "high",
      "Расчёт по программе лётных испытаний.", { creatorId: "mikhail.otdelov" }),
    T("t37", "Компоновка целевой нагрузки БЛА", "p_recon", "e_ilina", 24, -6, 22, "new", "mid", "",
      { creatorId: "mikhail.otdelov" }),
    T("t38", "Расчёт прочности крыла БЛА", "p_recon", "e_frolova", 28, -8, 18, "inwork", "high", "",
      { creatorId: "e_gromov",
        logs: [{ id: uid(), userId: "e_frolova", date: makeDate(-4), hours: 10, note: "МКЭ-модель" }] }),

    T("t39", "Испытания композитных образцов", "p_material", "e_tolka", 20, -20, 10, "inwork", "high",
      "Статические и усталостные образцы.", { creatorId: "e_gromov",
        logs: [{ id: uid(), userId: "e_tolka", date: makeDate(-7), hours: 12, note: "Серия А" }] }),
    T("t39b", "Паспортизация образцов ПКМ", "p_material", "e_gusev", 12, -14, 5, "review", "mid", "",
      { creatorId: "e_gromov" }),

    T("t41", "Разработка СЭС повышенной мощности", "p_energy", "e_koval", 36, -10, 24, "inwork", "crit",
      "Архитектура и алгоритмы.", { creatorId: "e_medvedev",
        logs: [{ id: uid(), userId: "e_koval", date: makeDate(-3), hours: 8, note: "Схема" }] }),
    T("t42", "Расчёт токов короткого замыкания", "p_energy", "e_melnik", 16, -6, 12, "new", "high", "",
      { creatorId: "e_medvedev" }),

    T("t43", "Разработка программы обучения", "p_train", "olga.personalova", 20, -6, 20, "inwork", "mid",
      "Модули для конструкторов.", { creatorId: "olga.personalova" }),
    T("t44", "Набор преподавателей", "p_train", "olga.personalova", 10, -4, 12, "new", "low", "",
      { creatorId: "olga.personalova" }),

    T("t46", "Аудит рабочих мест по ТБ", "p_safety", "sergey.adminov", 24, -20, 20, "inwork", "high", "",
      { creatorId: "sergey.adminov" }),
    T("t47", "Обучение сотрудников по ТБ", "p_safety", "e_otk_spec", 16, -10, 15, "new", "mid", "",
      { creatorId: "sergey.adminov" }),

    T("t48", "Подготовка документации СМК", "p_quality", "e_otk_head", 30, -15, 25, "inwork", "high", "",
      { creatorId: "e_otk_head",
        logs: [{ id: uid(), userId: "e_otk_head", date: makeDate(-5), hours: 8, note: "Карты процессов" }] }),
    T("t49", "Внутренний аудит процессов", "p_quality", "e_otk_spec", 20, -6, 20, "new", "mid", "",
      { creatorId: "e_otk_head" }),

    T("t51", "Адаптация РЛЭ для экспорта", "p_export", "e_anokhin", 28, -4, 25, "inwork", "high", "",
      { creatorId: "e_fedorov" }),
    T("t52", "Перевод технических бюллетеней", "p_export", "kirill.proektov", 20, -2, 28, "new", "mid", "",
      { creatorId: "e_fedorov" }),

    T("t53", "Испытания СЭС на стенде", "p_eng", "e_orlova", 24, -5, 20, "new", "high", "",
      { creatorId: "e_orlova" }),
    T("t54", "Интеграция стенда с САУ-900", "p_eng", "e_koval", 30, -3, 25, "new", "mid", "",
      { creatorId: "e_orlova" }),

    T("t55", "Экономический анализ проекта БЛА-С", "p_recon", "erik.ekonomistov", 14, -4, 10, "inwork", "mid",
      "Оценка стоимости жизненного цикла.", { creatorId: "mikhail.otdelov" }),

    // Дерево 1: цифровой двойник РД-900 (3 уровня)
    T("t40", "Цифровой двойник двигателя РД-900", "p_rd900", "e_tihonov", 60, -8, 40, "inwork", "crit",
      "Комплексная модель двигателя.", { creatorId: "e_krylov",
        logs: [{ id: uid(), userId: "e_tihonov", date: makeDate(-3), hours: 14, note: "Каркас модели" }] }),
    T("t40_sub1", "Модель компрессора", "p_rd900", "e_tihonov", 24, -6, 30, "inwork", "high", "",
      { parentTaskId: "t40", creatorId: "e_krylov" }),
    T("t40_sub1_sub1", "Расчёт лопаток первой ступени", "p_rd900", "e_tihonov", 10, -5, 20, "inwork", "high", "",
      { parentTaskId: "t40_sub1", creatorId: "e_krylov" }),
    T("t40_sub1_sub2", "Расчёт лопаток второй ступени", "p_rd900", "e_tihonov", 8, -4, 18, "new", "mid", "",
      { parentTaskId: "t40_sub1", creatorId: "e_krylov" }),
    T("t40_sub1_sub3", "Профилирование направляющих аппаратов", "p_rd900", "e_tihonov", 6, -3, 15, "new", "low", "",
      { parentTaskId: "t40_sub1", creatorId: "e_krylov" }),
    T("t40_sub2", "Модель камеры сгорания", "p_rd900", "e_melnik", 20, -5, 32, "inwork", "mid", "",
      { parentTaskId: "t40", creatorId: "e_krylov",
        logs: [{ id: uid(), userId: "e_melnik", date: makeDate(-2), hours: 6, note: "Геометрия" }] }),
    T("t40_sub2_sub1", "Теплонапряжённость жаровой трубы", "p_rd900", "e_melnik", 12, -4, 28, "inwork", "high", "",
      { parentTaskId: "t40_sub2", creatorId: "e_krylov" }),
    T("t40_sub2_sub2", "Гидравлика форсуночного блока", "p_rd900", "e_melnik", 8, -3, 26, "new", "mid", "",
      { parentTaskId: "t40_sub2", creatorId: "e_krylov" }),
    T("t40_sub3", "Модель турбины", "p_rd900", "e_krylov", 18, -4, 35, "new", "mid", "",
      { parentTaskId: "t40", creatorId: "e_krylov" }),
    T("t40_sub3_sub1", "Расчёт охлаждения лопаток ТВД", "p_rd900", "e_krylov", 10, -3, 30, "new", "high", "",
      { parentTaskId: "t40_sub3", creatorId: "e_krylov" }),

    // Дерево 2: инженерный стенд (3 уровня)
    T("t45", "Создание инженерного стенда полунатурного моделирования", "p_eng", "e_orlova", 80, -15, 45, "inwork", "crit",
      "Аппаратно-программный комплекс.", { creatorId: "e_orlova" }),
    T("t45_sub1", "Разработка аппаратной части стенда", "p_eng", "e_orlova", 30, -12, 35, "inwork", "high", "",
      { parentTaskId: "t45", creatorId: "e_orlova" }),
    T("t45_sub1_sub1", "Подбор и монтаж стойки ввода-вывода", "p_eng", "e_orlova", 12, -10, 25, "inwork", "high", "",
      { parentTaskId: "t45_sub1", creatorId: "e_orlova" }),
    T("t45_sub1_sub2", "Монтаж системы питания стенда", "p_eng", "e_koval", 8, -8, 22, "new", "mid", "",
      { parentTaskId: "t45_sub1", creatorId: "e_orlova" }),
    T("t45_sub2", "Разработка программной части стенда", "p_eng", "e_koval", 30, -10, 38, "inwork", "high", "",
      { parentTaskId: "t45", creatorId: "e_orlova",
        logs: [{ id: uid(), userId: "e_koval", date: makeDate(-4), hours: 10, note: "Ядро моделирования" }] }),
    T("t45_sub2_sub1", "Разработка математических моделей", "p_eng", "e_koval", 14, -8, 30, "inwork", "high", "",
      { parentTaskId: "t45_sub2", creatorId: "e_orlova" }),
    T("t45_sub2_sub2", "Интеграция с реальной САУ", "p_eng", "e_koval", 10, -4, 36, "new", "mid", "",
      { parentTaskId: "t45_sub2", creatorId: "e_orlova" }),
    T("t45_sub3", "Пусконаладочные работы", "p_eng", "e_orlova", 12, -6, 44, "new", "mid", "",
      { parentTaskId: "t45", creatorId: "e_orlova" }),

    // Дерево 3: сертификация ПКМ (3 уровня)
    T("t50", "Сертификация композитных материалов", "p_material", "e_gromov", 50, -30, 55, "inwork", "crit",
      "Полный цикл сертификации ПКМ.", { creatorId: "e_gromov" }),
    T("t50_sub1", "Статические испытания образцов", "p_material", "e_tolka", 20, -25, 30, "inwork", "high", "",
      { parentTaskId: "t50", creatorId: "e_gromov" }),
    T("t50_sub1_sub1", "Испытания на растяжение", "p_material", "e_tolka", 8, -24, 20, "inwork", "high", "",
      { parentTaskId: "t50_sub1", creatorId: "e_gromov" }),
    T("t50_sub1_sub2", "Испытания на сжатие", "p_material", "e_tolka", 6, -22, 18, "new", "mid", "",
      { parentTaskId: "t50_sub1", creatorId: "e_gromov" }),
    T("t50_sub1_sub3", "Испытания на сдвиг", "p_material", "e_gusev", 6, -20, 16, "new", "low", "",
      { parentTaskId: "t50_sub1", creatorId: "e_gromov" }),
    T("t50_sub2", "Усталостные испытания", "p_material", "e_frolova", 18, -20, 40, "inwork", "high", "",
      { parentTaskId: "t50", creatorId: "e_gromov",
        logs: [{ id: uid(), userId: "e_frolova", date: makeDate(-6), hours: 8, note: "Циклы" }] }),
    T("t50_sub2_sub1", "Испытания при 10⁵ циклов", "p_material", "e_frolova", 8, -18, 32, "inwork", "mid", "",
      { parentTaskId: "t50_sub2", creatorId: "e_gromov" }),
    T("t50_sub2_sub2", "Испытания при 10⁶ циклов", "p_material", "e_frolova", 8, -14, 38, "new", "mid", "",
      { parentTaskId: "t50_sub2", creatorId: "e_gromov" }),
    T("t50_sub3", "Оформление сертификата", "p_material", "e_gromov", 10, -8, 54, "new", "high", "",
      { parentTaskId: "t50", creatorId: "e_gromov" }),
  ];

  const vacations = [
    { id: "v1", empId: "e_somova", start: D(-2), end: D(5), type: "annual", comment: "Отдых, Сочи", status: "approved", delegation: { enabled: true, subId: "e_anokhin", statuses: ["inwork", "review"], state: "applied" } },
    { id: "v2", empId: "e_tihonov", start: D(3), end: D(14), type: "annual", comment: "Плановый отпуск", status: "pending", delegation: { enabled: true, subId: "e_melnik", statuses: ["inwork"], state: null } },
    { id: "v3", empId: "e_gusev", start: D(-20), end: D(-8), type: "sick", comment: "Больничный лист", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    { id: "v4", empId: "isaev", start: D(10), end: D(17), type: "annual", comment: "Отпуск", status: "pending", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    { id: "v5", empId: "e_anokhin", start: D(-15), end: D(-3), type: "annual", comment: "Уже был", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
  ];

  /**
   * Запросы на изменение. Единый массив вместо пары hoursRequests +
   * deadlineRequests: и часы, и срок — это один поток «исполнитель
   * попросил → директор решил», различается только правило применения
   * (см. utils/changeKinds). Поля:
   *
   *   changeKind — id правила: 'hours' | 'deadline';
   *   targetType — 'task' | 'project';
   *   targetId   — id целевой сущности;
   *   oldValue   — старое значение (число для часов, ISO-дата для срока);
   *   newValue   — новое значение;
   *   status     — 'pending' | 'approved' | 'rejected';
   *   rejectionReason — причина отклонения или null.
   */
  const changeRequests = [
    {
      id: 'cr1',
      changeKind: 'hours',
      targetType: 'task',
      targetId: 't04',
      oldValue: 32,
      newValue: 48,
      reason: 'Добавился расчёт усталостных трещин по требованию ОТК.',
      reqId: 'e_morozov',
      status: 'pending',
      rejectionReason: null,
      ts: now - 3600000 * 5,
    },
    {
      id: 'cr2',
      changeKind: 'hours',
      targetType: 'project',
      targetId: 'p_lm24',
      oldValue: 180,
      newValue: 210,
      reason: 'Расширение scope: добавлены работы по сертификации.',
      reqId: 'e_morozov',
      status: 'pending',
      rejectionReason: null,
      ts: now - 3600000 * 20,
    },
    {
      id: 'cr3',
      changeKind: 'deadline',
      targetType: 'task',
      targetId: 't01',
      oldValue: D(6),
      newValue: D(12),
      reason: 'Дополнительное согласование с ОТК, сдвиг контрольной точки.',
      reqId: 'isaev',
      status: 'pending',
      rejectionReason: null,
      ts: now - 3600000 * 8,
    },
  ];

  const regRequests = [
    { id: "rg1", first: "Олег", last: "Новиков", email: "novikov", pass: "Exec2026!", status: "pending", ts: now - 3600000 * 26 },
  ];

  /**
   * Уведомления. Для запросов на изменение targetType = 'changeRequest',
   * а конкретная вкладка раздела «Запросы и заявки» — в targetTab
   * (совпадает с changeKind). Остальные targetType — как раньше.
   */
  const notifications = [
    // ---------- aleksey.gendirov (director) ----------
    {
      id: uid(), userId: 'aleksey.gendirov',
      text: 'Запрос на изменение плановых часов по задаче «Отчёт по прочности фюзеляжа» ожидает решения.',
      ts: now - 3600000 * 5, read: false,
      targetType: 'changeRequest', targetId: 'cr1', targetTab: 'hours',
    },
    {
      id: uid(), userId: 'aleksey.gendirov',
      text: 'Запрос на изменение плановых часов проекта «Лёгкий многоцелевой самолёт ЛМ-24» ожидает решения.',
      ts: now - 3600000 * 20, read: false,
      targetType: 'changeRequest', targetId: 'cr2', targetTab: 'hours',
    },
    {
      id: uid(), userId: 'aleksey.gendirov',
      text: 'Запрос на изменение срока задачи «Расчёт подъёмной силы крыла» ожидает решения.',
      ts: now - 3600000 * 8, read: false,
      targetType: 'changeRequest', targetId: 'cr3', targetTab: 'deadline',
    },
    {
      id: uid(), userId: 'aleksey.gendirov',
      text: 'Проект «Экспортная поддержка ЛМ-24» переведён в статус «Активный».',
      ts: now - 3600000 * 60, read: true,
      targetType: 'project', targetId: 'p_export', targetTab: null,
    },

    // ---------- sergey.adminov (admin) ----------
    {
      id: uid(), userId: 'sergey.adminov',
      text: 'Новая заявка на регистрацию: Новиков Олег.',
      ts: now - 3600000 * 26, read: false,
      targetType: 'registration', targetId: 'rg1', targetTab: null,
    },
    {
      id: uid(), userId: 'sergey.adminov',
      text: 'Задача «Аудит рабочих мест по ТБ» просрочена.',
      ts: now - 3600000 * 12, read: false,
      targetType: 'task', targetId: 't46', targetTab: null,
    },
    {
      id: uid(), userId: 'sergey.adminov',
      text: 'Создан сотрудник Мельник Светлана.',
      ts: now - 3600000 * 240, read: true,
      targetType: 'employee', targetId: 'e_melnik', targetTab: null,
    },

    // ---------- erik.ekonomistov (economist) ----------
    {
      id: uid(), userId: 'erik.ekonomistov',
      text: 'Вам назначена задача «Экономический анализ проекта БЛА-С».',
      ts: now - 3600000 * 8, read: false,
      targetType: 'task', targetId: 't55', targetTab: null,
    },
    {
      id: uid(), userId: 'erik.ekonomistov',
      text: 'Вы назначены ответственным по проекту «Оптимизация бизнес-процессов».',
      ts: now - 3600000 * 40, read: true,
      targetType: 'project', targetId: 'p_bp', targetTab: null,
    },

    // ---------- ivan.konstruktorov (kb_chief ЛА) ----------
    {
      id: uid(), userId: 'ivan.konstruktorov',
      text: 'В КБ «ЛА» создан проект «Разведывательный БЛА среднего класса».',
      ts: now - 3600000 * 22, read: false,
      targetType: 'project', targetId: 'p_recon', targetTab: null,
    },
    {
      id: uid(), userId: 'ivan.konstruktorov',
      text: 'Задача «Руководство проектированием крыла» перешла в статус «В работе».',
      ts: now - 3600000 * 48, read: true,
      targetType: 'task', targetId: 't23', targetTab: null,
    },

    // ---------- e_belova (kb_chief АД) ----------
    {
      id: uid(), userId: 'e_belova',
      text: 'В КБ «АД» создан проект «Система управления двигателем РД-900».',
      ts: now - 3600000 * 22, read: false,
      targetType: 'project', targetId: 'p_sau', targetTab: null,
    },
    {
      id: uid(), userId: 'e_belova',
      text: 'Задача «Термогазодинамический расчёт компрессора» перешла в статус «В работе».',
      ts: now - 3600000 * 36, read: false,
      targetType: 'task', targetId: 't10', targetTab: null,
    },
    {
      id: uid(), userId: 'e_belova',
      text: 'Проект «Система электроснабжения нового поколения» переведён в статус «Активный».',
      ts: now - 3600000 * 60, read: true,
      targetType: 'project', targetId: 'p_energy', targetTab: null,
    },

    // ---------- olga.personalova (hr) ----------
    {
      id: uid(), userId: 'olga.personalova',
      text: 'Тихонов Е. подал заявку на отпуск с делегированием задач.',
      ts: now - 3600000 * 8, read: false,
      targetType: 'vacation', targetId: 'v2', targetTab: null,
    },
    {
      id: uid(), userId: 'olga.personalova',
      text: 'Исаев Р. подал заявку на отпуск.',
      ts: now - 3600000 * 30, read: false,
      targetType: 'vacation', targetId: 'v4', targetTab: null,
    },
    {
      id: uid(), userId: 'olga.personalova',
      text: 'В проекте «Программа обучения инженеров-конструкторов» создана задача «Набор преподавателей».',
      ts: now - 3600000 * 50, read: true,
      targetType: 'task', targetId: 't44', targetTab: null,
    },
    {
      id: uid(), userId: 'olga.personalova',
      text: 'Создан сотрудник Анохин Сергей.',
      ts: now - 3600000 * 400, read: true,
      targetType: 'employee', targetId: 'e_anokhin', targetTab: null,
    },

    // ---------- mikhail.otdelov (head, project_lead) ----------
    {
      id: uid(), userId: 'mikhail.otdelov',
      text: 'Вы назначены ответственным по проекту «Разведывательный БЛА среднего класса».',
      ts: now - 3600000 * 22, read: false,
      targetType: 'project', targetId: 'p_recon', targetTab: null,
    },
    {
      id: uid(), userId: 'mikhail.otdelov',
      text: 'Задача «Координация аэродинамических расчётов» требует внимания: срок близко.',
      ts: now - 3600000 * 18, read: false,
      targetType: 'task', targetId: 't25', targetTab: null,
    },
    {
      id: uid(), userId: 'mikhail.otdelov',
      text: 'Вам предложено временное принятие роли «Ответственный по проекту».',
      ts: now - 3600000 * 90, read: true,
      targetType: 'delegation', targetId: 'rd_demo_1', targetTab: null,
    },

    // ---------- nikolay.managerov (project_manager) ----------
    {
      id: uid(), userId: 'nikolay.managerov',
      text: 'Задача «Управление проектом ОБРЭО»: срок исполнения изменён.',
      ts: now - 3600000 * 40, read: false,
      targetType: 'task', targetId: 't27', targetTab: null,
    },
    {
      id: uid(), userId: 'nikolay.managerov',
      text: 'В проекте «Разработка ПО для ОБРЭО» создана задача «Перевод технических бюллетеней».',
      ts: now - 3600000 * 6, read: false,
      targetType: 'project', targetId: 'p_obr_sw', targetTab: null,
    },

    // ---------- kirill.proektov (project_lead) ----------
    {
      id: uid(), userId: 'kirill.proektov',
      text: 'Вам назначена задача «Перевод технических бюллетеней».',
      ts: now - 3600000 * 6, read: false,
      targetType: 'task', targetId: 't52', targetTab: null,
    },
    {
      id: uid(), userId: 'kirill.proektov',
      text: 'Задача «Планирование испытаний» перешла в статус «Новая».',
      ts: now - 3600000 * 200, read: true,
      targetType: 'task', targetId: 't26', targetTab: null,
    },
    {
      id: uid(), userId: 'kirill.proektov',
      text: 'Вам предложено временное принятие роли «Менеджер проектов».',
      ts: now - 3600000 * 80, read: false,
      targetType: 'delegation', targetId: 'rd_demo_2', targetTab: null,
    },

    // ---------- isaev (executor) ----------
    {
      id: uid(), userId: 'isaev',
      text: 'Вам назначена задача «Аэродинамический расчёт БЛА-С».',
      ts: now - 3600000 * 10, read: false,
      targetType: 'task', targetId: 't36', targetTab: null,
    },
    {
      id: uid(), userId: 'isaev',
      text: 'Морозов К. упомянул(а) вас: «@Исаев Роман — подключите, пожалуйста, отдел прочности к пятнице.»',
      ts: now - 3600000 * 20, read: false,
      targetType: 'task', targetId: 't01', targetTab: 'chat',
    },
    {
      id: uid(), userId: 'isaev',
      text: 'Задача «Расчёт подъёмной силы крыла»: срок приближается.',
      ts: now - 3600000 * 30, read: false,
      targetType: 'task', targetId: 't01', targetTab: null,
    },
    {
      id: uid(), userId: 'isaev',
      text: 'Ваш отпуск с 17.10 по 24.10 находится на рассмотрении.',
      ts: now - 3600000 * 30, read: true,
      targetType: 'vacation', targetId: 'v4', targetTab: null,
    },
  ];

  const audit = [
    { id: uid(), ts: now - 86400000 * 2, userId: "e_morozov", action: "Запрос изменения часов", details: "t04: 32 → 48 ч" },
    { id: uid(), ts: now - 86400000 * 3, userId: "e_morozov", action: "Утверждено делегирование отпуска", details: "Сомова Е. → Анохин С." },
    { id: uid(), ts: now - 86400000 * 6, userId: "nikolay.managerov", action: "Создан проект", details: "ОБРЭО-01" },
  ];

  return {
    settings,
    kbs,
    departments,
    employees,
    projects,
    tasks,
    vacations,
    changeRequests,
    roleDelegations: [],
    regRequests,
    notifications,
    audit,
    templates: [],
  };
}