import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import { UserGroupIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Avatar } from './ui/Avatar';

export const ProjectsKanban = () => {
  const { projects, tasks, users, user: currentUser } = useStore();
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    // Группировка проектов по статусам
    const statusMap = {
      new: 'Новые',
      in_progress: 'В работе',
      completed: 'Завершены'
    };

    const cols = Object.keys(statusMap).map(status => ({
      id: status,
      title: statusMap[status],
      projects: projects.filter(p => p.status === status)
    }));
    setColumns(cols);
  }, [projects]);

  const getProjectTasks = (projectId) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const getProgress = (projectId) => {
    const projTasks = getProjectTasks(projectId);
    if (projTasks.length === 0) return 0;
    const completed = projTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6 overflow-hidden flex flex-col">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Канбан проектов</h2>
      
      {/* Контейнер колонок: Flex-row для горизонтального расположения */}
      <div className="flex flex-row gap-6 overflow-x-auto h-full pb-4">
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-80 bg-gray-100 rounded-xl flex flex-col max-h-full">
            {/* Заголовок колонки */}
            <div className="p-4 font-semibold text-gray-700 flex justify-between items-center border-b border-gray-200 bg-white rounded-t-xl shadow-sm">
              <span>{col.title}</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
                {col.projects.length}
              </span>
            </div>

            {/* Список проектов в колонке */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {col.projects.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-10 italic">
                  Нет проектов
                </div>
              ) : (
                col.projects.map(project => {
                  const progress = getProgress(project.id);
                  const projectTasks = getProjectTasks(project.id);
                  const manager = users.find(u => u.id === project.managerId);
                  const teamIds = project.teamIds || [];
                  const teamMembers = users.filter(u => teamIds.includes(u.id));

                  return (
                    <div key={project.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3">
                      {/* Название и тип */}
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-gray-800 leading-tight break-words line-clamp-2">
                            {project.name}
                          </h3>
                          {project.type === 'admin' && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              Админ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span className="capitalize">{project.category || 'Общее'}</span>
                        </div>
                      </div>

                      {/* Прогресс бар */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 text-right">{progress}%</div>

                      {/* Мета информация */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
                        <div className="flex items-center gap-1" title="Задач">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>{projectTasks.length}</span>
                        </div>
                        {project.deadline && (
                          <div className="flex items-center gap-1" title="Дедлайн">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Команда */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-2 overflow-hidden">
                          {teamMembers.slice(0, 5).map(member => (
                            <Avatar 
                              key={member.id} 
                              url={member.avatar} 
                              name={member.name} 
                              size="sm" 
                              className="border-2 border-white ring-1 ring-gray-100"
                            />
                          ))}
                          {teamMembers.length > 5 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 border-2 border-white">
                              +{teamMembers.length - 5}
                            </div>
                          )}
                        </div>
                        
                        {manager && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[100px]" title={manager.name}>
                            Лид: {manager.name.split(' ')[1]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
