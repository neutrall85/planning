// src/components/ProjectChat.jsx
import { useCallback } from 'react';
import Discussion from './Discussion';

// Модульная пустая ссылка: стабильный [] для случаев, когда родитель
// не передал массив. Инлайн `tasks || []` создавал бы новый массив на
// каждом рендере.
const EMPTY_ARRAY = Object.freeze([]);

/**
 * Чат проекта. Тонкая обёртка над Discussion: передаёт projectId и
 * знает, как открыть задачу по клику из комментария.
 */
export const ProjectChat = ({
  projectId,
  store,
  currentUser,
  toast,
  employees,
  candidates,
  openTask,
  tasks,
  readOnly = false,
}) => {
  const handleTaskClick = useCallback((taskId) => {
    openTask(taskId, 'form', null, null, projectId, 'chat');
  }, [openTask, projectId]);

  return (
    <Discussion
      store={store}
      projectId={projectId}
      currentUser={currentUser}
      candidates={candidates || EMPTY_ARRAY}
      readOnly={readOnly}
      toast={toast}
      employees={employees}
      onTaskClick={handleTaskClick}
      showTaskLink={true}
      tasks={tasks || EMPTY_ARRAY}
    />
  );
};