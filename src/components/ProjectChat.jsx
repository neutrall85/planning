// src/components/ProjectChat.jsx
import React from 'react';
import Discussion from './Discussion';

const ProjectChat = ({ projectId, store, currentUser, toast, employees, candidates, openTask, tasks }) => {
  const handleTaskClick = (taskId) => {
    openTask(taskId, 'form', null, null, projectId, 'chat');
  };

  return (
    <Discussion
      store={store}
      filter={{ projectId }}
      currentUser={currentUser}
      candidates={candidates || []}
      readOnly={false}
      canComment={true}
      toast={toast}
      employees={employees}
      onTaskClick={handleTaskClick}
      showTaskLink={true}
      tasks={tasks || []}
    />
  );
};

export default ProjectChat;