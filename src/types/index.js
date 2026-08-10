/**
 * JSDoc типизация для основных сущностей приложения
 * Используется для улучшения TypeScript-поддержки в JSX файлах
 */

/**
 * @typedef {Object} Department
 * @property {string} id
 * @property {string} name
 * @property {string|null} parentId
 */

/**
 * @typedef {Object} EmployeeDepartment
 * @property {string} deptId
 * @property {boolean} [primary]
 * @property {string} [roleId]
 */

/**
 * @typedef {'admin'|'director'|'economist'|'kb_chief'|'head'|'project_lead'|'project_manager'|'hr'|'executor'} Role
 */

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} last
 * @property {string} first
 * @property {string} [middle]
 * @property {string} email
 * @property {string} [pass]
 * @property {string} position
 * @property {EmployeeDepartment[]} departments
 * @property {Role[]} roles
 * @property {string[]} kbIds
 * @property {string[]} headDeptIds
 * @property {string} [phone]
 * @property {string} [extension]
 * @property {string} [tab]
 * @property {{deadlineEmail: boolean, overdueDigest: boolean, commentSub: boolean}} [notif]
 * @property {number} [failed]
 * @property {number} [lockUntil]
 * @property {boolean} [fired]
 * @property {string|null} [photo]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {'new'|'inwork'|'review'|'closed'|'cancelled'} TaskStatus
 */

/**
 * @typedef {'low'|'mid'|'high'|'crit'} Priority
 */

/**
 * @typedef {'FS'|'SS'|'FF'|'SF'} DependencyType
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} projectId
 * @property {TaskStatus} status
 * @property {Priority} priority
 * @property {string[]} assigneeIds
 * @property {string} creatorId
 * @property {number} [plannedHours]
 * @property {number} [actualHours]
 * @property {string} [deadline]
 * @property {string|null} [dependencyId]
 * @property {DependencyType} [dependencyType]
 * @property {string} [createdAt]
 * @property {string} [closedAt]
 * @property {boolean} [archived]
 * @property {string} [archivedAt]
 */

/**
 * @typedef {'active'|'inactive'|'closed'|'cancelled'} ProjectStatus
 */

/**
 * @typedef {'prod'|'admin'} ProjectType
 */

/**
 * @typedef {'AOG'|'CRIT'|'NORM'} ProjectCategory
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {ProjectType} [ptype]
 * @property {ProjectStatus} [status]
 * @property {ProjectCategory} [category]
 * @property {number} [budget]
 * @property {string} managerId
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {boolean} [archived]
 * @property {string} [archivedAt]
 */

/**
 * @typedef {'annual'|'admin'|'sick'|'other'} VacationType
 */

/**
 * @typedef {Object} Delegation
 * @property {boolean} [enabled]
 * @property {string} [subId]
 * @property {TaskStatus[]} [statuses]
 */

/**
 * @typedef {Object} Vacation
 * @property {string} id
 * @property {string} empId
 * @property {string} start
 * @property {string} end
 * @property {VacationType} type
 * @property {'draft'|'submitted'|'approved'|'rejected'} [status]
 * @property {Delegation} [delegation]
 * @property {string} [comment]
 */

/**
 * @typedef {'task'|'project'|'vacation'|'comment'|'system'} NotificationTargetType
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} text
 * @property {number} ts
 * @property {boolean} [read]
 * @property {NotificationTargetType|null} [targetType]
 * @property {string|null} [targetId]
 */

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} taskId
 * @property {string} authorId
 * @property {string} text
 * @property {string} createdAt
 * @property {string} [updatedAt]
 * @property {string} [parentId]
 * @property {string[]} [mentions]
 */

/**
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} action
 * @property {string} details
 * @property {string} [entityType]
 * @property {string} [entityId]
 * @property {string} userId
 * @property {string} timestamp
 */

/**
 * @typedef {Object} RegRequest
 * @property {string} id
 * @property {string} email
 * @property {string} first
 * @property {string} last
 * @property {string} token
 * @property {string} createdAt
 */

/**
 * @typedef {Object} StoreData
 * @property {Employee[]} employees
 * @property {Department[]} departments
 * @property {Task[]} tasks
 * @property {Project[]} projects
 * @property {Vacation[]} vacations
 * @property {Notification[]} notifications
 * @property {Comment[]} comments
 * @property {AuditLog[]} auditLog
 * @property {RegRequest[]} regRequests
 */

/**
 * @typedef {Object} DataContextValue
 * @property {StoreData} data
 * @property {(fn: (state: StoreData) => StoreData) => void} setDb
 */

export {};
