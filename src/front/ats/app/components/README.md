# Toast Notification System

A modern, accessible toast notification system for the ProfessionMap ATS application.

## Features

- ✅ **Success, Error, Warning, and Info** toast types
- 🎨 **Beautiful animations** with slide-in/out effects
- 📱 **Responsive design** that works on all devices
- 🌙 **Dark mode support** with automatic theme detection
- ♿ **Accessible** with proper ARIA labels and keyboard support
- ⏱️ **Auto-dismiss** with customizable duration
- 🎯 **Easy to use** with simple React hooks

## Usage

### Basic Usage

```tsx
import { useToast } from '../components/ToastProvider';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleSubmit = async () => {
    try {
      await api.submitForm();
      showSuccess("Успешно!", "Форма отправлена");
    } catch (error) {
      showError("Ошибка!", "Не удалось отправить форму");
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Advanced Usage

```tsx
const { showToast } = useToast();

// Custom toast with specific duration
showToast({
  type: 'success',
  title: 'Custom Toast',
  message: 'This will auto-dismiss in 10 seconds',
  duration: 10000
});
```

## API Reference

### useToast Hook

The `useToast` hook provides the following methods:

#### `showSuccess(title: string, message?: string, duration?: number)`
Shows a success toast notification.

#### `showError(title: string, message?: string, duration?: number)`
Shows an error toast notification.

#### `showWarning(title: string, message?: string, duration?: number)`
Shows a warning toast notification.

#### `showInfo(title: string, message?: string, duration?: number)`
Shows an info toast notification.

#### `showToast(toast: Omit<Toast, 'id'>)`
Shows a custom toast with full control over properties.

#### `removeToast(id: string)`
Manually remove a specific toast.

#### `clearAllToasts()`
Remove all active toasts.

### Toast Interface

```tsx
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, default: 5000
}
```

## Styling

The toast system uses CSS classes that can be customized:

- `.toast-container` - Container for all toasts
- `.toast` - Individual toast element
- `.toast-success` - Success toast styling
- `.toast-error` - Error toast styling
- `.toast-warning` - Warning toast styling
- `.toast-info` - Info toast styling
- `.toast-icon` - Icon container
- `.toast-content` - Content area
- `.toast-title` - Toast title
- `.toast-message` - Toast message
- `.toast-close` - Close button

## Accessibility

- All toasts have proper ARIA labels
- Close button has `aria-label="Закрыть уведомление"`
- Keyboard navigation support
- Screen reader friendly

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Backdrop filter support for glassmorphism effect
- CSS custom properties for theming

## Examples

### Form Submission

```tsx
const handleSubmit = async (formData) => {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      showSuccess("Форма отправлена", "Ваши данные успешно сохранены");
    } else {
      const error = await response.json();
      showError("Ошибка отправки", error.message);
    }
  } catch (error) {
    showError("Ошибка соединения", "Не удалось подключиться к серверу");
  }
};
```

### API Error Handling

```tsx
const handleApiCall = async () => {
  try {
    const data = await api.getData();
    showSuccess("Данные загружены", `Получено ${data.length} записей`);
  } catch (error) {
    if (error.status === 401) {
      showError("Ошибка авторизации", "Необходимо войти в систему");
      navigate('/login');
    } else {
      showError("Ошибка загрузки", error.message);
    }
  }
};
```

## Integration

The toast system is already integrated into the application:

1. **ToastProvider** is added to the root layout
2. **All forms** use toast notifications instead of alerts
3. **API responses** are handled with appropriate toast messages
4. **Error states** are displayed as toast notifications

## Customization

To customize the appearance, modify the CSS variables in `Toast.css`:

```css
:root {
  --toast-success-color: #22c55e;
  --toast-error-color: #ef4444;
  --toast-warning-color: #f59e0b;
  --toast-info-color: #3b82f6;
}
```
