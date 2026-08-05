import React from "react";
import { TASK_STATUSES, PRIORITIES, VACATION_TYPES } from "../utils/constants";
import { fmtDMY, fmtDT, TODAY, isTaskActive } from "../utils/date";
import { hasRole } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";

export default function Reports({ db, dbFull, ur }) {
  const { getTaskSpent, getProjectStats, empName, primaryDept } = useDataHelpers(db);
  // Заменяем !t.archived на isTaskActive(t)
  const tasks = db.tasks.filter(t => isTaskActive(t));

  const downloadXLSX = (name, rows) => {
    // Заглушка для XLSX
    alert(`Выгрузка XLSX "${name}" пока не реализована.`);
  };

  const reports = [
    { id: 'load', name: 'Загрузка сотрудников', desc: 'Плановые и фактические часы по дням/неделям/месяцам.', acc: ['admin','director','economist','kb_chief','head'] },
    { id: 'proj', name: 'Сводка по проектам', desc: 'План vs факт, статусы, процент использования бюджета.', acc: ['admin','director','economist','kb_chief','head','pm'] },
    { id: 'over', name: 'Просроченные задачи', desc: 'Группировка по исполнителям и проектам.', acc: ['admin','director','economist','kb_chief','head','pm'] },
    { id: 'prio', name: 'Приоритеты и статусы', desc: 'Распределение задач.', acc: ['admin','director','economist','kb_chief','head','pm'] },
    { id: 'fin', name: 'Финансовый отчёт', desc: 'Трудоёмкость в чел.-ч по проектам и подразделениям.', acc: ['admin','director','economist'] },
    { id: 'vac', name: 'Отчёты по отпускам', desc: 'Даты, типы, плановые и фактические дни отсутствия.', acc: ['admin','director','economist','kb_chief','head','hr'] },
    { id: 'hrmove', name: 'Кадровые перемещения', desc: 'Изменения привязки сотрудников к отделам (журнал).', acc: ['admin','director','hr'] },
    { id: 'arch', name: 'Отчёт по архивным данным', desc: 'Архивные проекты и задачи — просмотр и выгрузка (только чтение).', acc: ['admin','director'] },
  ].filter(r => r.acc === 'all' || r.acc.some(a => ur.roles.includes(a)));

  const exportReport = (id) => {
    let rows = [];
    if (id === 'load') {
      rows = [
        ['Сотрудник','Подразделение','Статус','План, ч','Факт, ч','Задач в работе'],
        ...db.employees.map(e => {
          const tasks = db.tasks.filter(t => isTaskActive(t) && (t.assigneeIds || []).includes(e.id));
          return [
            `${e.last} ${e.first}`,
            primaryDept(e)?.name || '',
            'Работает',
            tasks.filter(t => !['closed','cancelled'].includes(t.status)).reduce((s, t) => s + (t.plannedHours || 0), 0),
            tasks.reduce((s, t) => s + getTaskSpent(t), 0),
            tasks.filter(t => !['closed','cancelled'].includes(t.status)).length
          ];
        })
      ];
    } else if (id === 'proj') {
      rows = [
        ['Код','Проект','Тип','Бюджет, ч','План задач, ч','Факт, ч','% использования','Статус'],
        ...db.projects.filter(p => !p.archived).map(p => {
          const stats = getProjectStats(p.id);
          return [
            p.code, p.name, p.ptype || 'prod',
            p.budget ?? '—',
            stats.plan,
            stats.fact,
            p.budget ? Math.round((stats.fact / p.budget) * 100) + '%' : '—',
            p.status === 'active' ? 'Активный' : 'Закрыт'
          ];
        })
      ];
    } else if (id === 'over') {
      rows = [
        ['Задача','Проект','Исполнители','Дедлайн','Дней просрочки'],
        ...tasks.filter(t => t.deadline && !['closed','cancelled'].includes(t.status) && t.deadline < TODAY).map(t => [
          t.title,
          db.projects.find(p => p.id === t.projectId)?.code,
          (t.assigneeIds || []).map(id => empName(id)).join(', '),
          fmtDMY(t.deadline),
          -Math.round((new Date(t.deadline) - new Date(TODAY)) / 86400000)
        ])
      ];
    } else if (id === 'prio') {
      rows = [
        ['Приоритет','Статус','Кол-во'],
        ...Object.keys(PRIORITIES).flatMap(pr => Object.keys(TASK_STATUSES).map(st => [
          PRIORITIES[pr].label,
          TASK_STATUSES[st].label,
          tasks.filter(t => t.priority === pr && t.status === st).length
        ]))
      ];
    } else if (id === 'fin') {
      rows = [
        ['Проект','Чел.-ч план','Чел.-ч факт'],
        ...db.projects.filter(p => !p.archived).map(p => {
          const stats = getProjectStats(p.id);
          return [p.name, stats.plan, stats.fact];
        })
      ];
    } else if (id === 'vac') {
      rows = [
        ['Сотрудник','Начало','Окончание','Тип','Дней','Статус'],
        ...db.vacations.map(v => [
          empName(v.empId),
          fmtDMY(v.start),
          fmtDMY(v.end),
          VACATION_TYPES[v.type],
          Math.round((new Date(v.end) - new Date(v.start)) / 86400000) + 1,
          { pending: 'на утверждении', approved: 'утверждён', rejected: 'отклонён' }[v.status]
        ])
      ];
    } else if (id === 'hrmove') {
      rows = [
        ['Дата','Пользователь','Действие','Данные'],
        ...dbFull.audit.filter(a => a.action.includes('подразделени') || a.action.includes('регистрац') || a.action.includes('Архив')).map(a => [
          fmtDT(a.ts),
          empName(a.userId),
          a.action,
          a.details
        ])
      ];
    } else if (id === 'arch') {
      rows = [
        ['Тип','Код / название','Ответственный / исполнители','Закрыт','В архиве с','План, ч','Факт, ч'],
        ...dbFull.projects.filter(p => p.archived).map(p => {
          const stats = getProjectStats(p.id);
          return [
            'Проект',
            `${p.code} — ${p.name}`,
            empName(p.managerId),
            fmtDMY(p.closedAt),
            fmtDMY(p.archivedAt),
            p.budget ?? '—',
            stats.fact
          ];
        }),
        ...dbFull.tasks.filter(t => t.archived).map(t => [
          'Задача',
          t.title,
          (t.assigneeIds || []).map(id => empName(id)).join(', '),
          fmtDMY(t.closedAt),
          fmtDMY(t.archivedAt),
          t.plannedHours ?? '—',
          getTaskSpent(t)
        ])
      ];
    }
    downloadXLSX(`${id}.xlsx`, rows);
  };

  return (
    <div className="rep">
      <div className="rep-cards">
        <div className="rep-card"><div className="rep-num">{tasks.length}</div><div className="rep-lbl">задач</div></div>
        <div className="rep-card"><div className="rep-num" style={{ color: '#ef4444' }}>{tasks.filter(t => t.deadline && !['closed','cancelled'].includes(t.status) && t.deadline < TODAY).length}</div><div className="rep-lbl">просрочено</div></div>
        <div className="rep-card"><div className="rep-num">{tasks.reduce((s, t) => s + (t.plannedHours || 0), 0)} ч</div><div className="rep-lbl">план</div></div>
        <div className="rep-card"><div className="rep-num" style={{ color: '#10b981' }}>{tasks.reduce((s, t) => s + getTaskSpent(t), 0)} ч</div><div className="rep-lbl">факт</div></div>
      </div>

      <div className="rep-list">
        {reports.map(r => (
          <div key={r.id} className="rep-panel rep-item">
            <div><div className="rep-panel-title" style={{ marginBottom: 4 }}>{r.name}</div><div className="mut sm">{r.desc}</div></div>
            <div className="rep-btns">
              <button className="btn primary sm" onClick={() => exportReport(r.id)}><Ic d={ICONS.download} size={13} /> XLSX</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}