// Toast.jsx - точка входа для совместимости
// useToast экспортируется из ToastLogic.jsx (только хук = Fast Refresh OK)
// Компоненты экспортируются из ToastComponent.jsx

export { useToastLogic as useToast } from './ToastLogic';
export { ToastComponent as Toast, ToastComponent as default } from './ToastComponent';