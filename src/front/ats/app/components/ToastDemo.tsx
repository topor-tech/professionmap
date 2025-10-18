import React from 'react';
import { useToast } from './ToastProvider';

/**
 * Demo component to showcase toast notifications
 * This can be used for testing the toast system
 */
export function ToastDemo() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleSuccess = () => {
    showSuccess("Успешно!", "Операция выполнена успешно");
  };

  const handleError = () => {
    showError("Ошибка!", "Что-то пошло не так");
  };

  const handleWarning = () => {
    showWarning("Внимание!", "Обратите внимание на это");
  };

  const handleInfo = () => {
    showInfo("Информация", "Полезная информация для вас");
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Toast Demo</h2>
      <div className="flex gap-2">
        <button
          onClick={handleSuccess}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Success Toast
        </button>
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Error Toast
        </button>
        <button
          onClick={handleWarning}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Warning Toast
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Info Toast
        </button>
      </div>
    </div>
  );
}
