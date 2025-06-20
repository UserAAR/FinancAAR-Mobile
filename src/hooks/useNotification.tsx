import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlert, { CustomAlertProps } from '../components/CustomAlert';
import Toast, { ToastProps } from '../components/Toast';

interface NotificationContextType {
  showAlert: (props: Omit<CustomAlertProps, 'visible' | 'onDismiss'>) => void;
  showToast: (props: Omit<ToastProps, 'visible' | 'onDismiss'>) => void;
  hideAlert: () => void;
  hideToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [alertProps, setAlertProps] = useState<CustomAlertProps | null>(null);
  const [toastProps, setToastProps] = useState<ToastProps | null>(null);

  const showAlert = (props: Omit<CustomAlertProps, 'visible' | 'onDismiss'>) => {
    setAlertProps({
      ...props,
      visible: true,
      onDismiss: hideAlert,
    });
  };

  const showToast = (props: Omit<ToastProps, 'visible' | 'onDismiss'>) => {
    setToastProps({
      ...props,
      visible: true,
      onDismiss: hideToast,
    });
  };

  const hideAlert = () => {
    setAlertProps(null);
  };

  const hideToast = () => {
    setToastProps(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        showAlert,
        showToast,
        hideAlert,
        hideToast,
      }}
    >
      {children}
      
      {alertProps && <CustomAlert {...alertProps} />}
      {toastProps && <Toast {...toastProps} />}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Convenience functions for common use cases
export function useAlert() {
  const { showAlert, hideAlert } = useNotification();

  return {
    success: (title: string, message: string, onConfirm?: () => void) => {
      showAlert({
        type: 'success',
        title,
        message,
        primaryButton: {
          text: 'OK',
          onPress: () => {
            hideAlert();
            if (onConfirm) onConfirm();
          },
        },
      });
    },

    error: (title: string, message: string, onConfirm?: () => void) => {
      showAlert({
        type: 'error',
        title,
        message,
        primaryButton: {
          text: 'OK',
          onPress: () => {
            hideAlert();
            if (onConfirm) onConfirm();
          },
        },
      });
    },

    warning: (title: string, message: string, onConfirm?: () => void) => {
      showAlert({
        type: 'warning',
        title,
        message,
        primaryButton: {
          text: 'OK',
          onPress: () => {
            hideAlert();
            if (onConfirm) onConfirm();
          },
        },
      });
    },

    confirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = 'Confirm',
      cancelText: string = 'Cancel'
    ) => {
      showAlert({
        type: 'warning',
        title,
        message,
        primaryButton: {
          text: confirmText,
          onPress: () => {
            hideAlert();
            onConfirm();
          },
        },
        secondaryButton: {
          text: cancelText,
          onPress: () => {
            hideAlert();
            if (onCancel) onCancel();
          },
        },
      });
    },
  };
}

export function useToast() {
  const { showToast } = useNotification();

  return {
    success: (title: string, message?: string) => {
      showToast({
        type: 'success',
        title,
        message,
      });
    },

    error: (title: string, message?: string) => {
      showToast({
        type: 'error',
        title,
        message,
      });
    },

    warning: (title: string, message?: string) => {
      showToast({
        type: 'warning',
        title,
        message,
      });
    },

    info: (title: string, message?: string) => {
      showToast({
        type: 'info',
        title,
        message,
      });
    },
  };
} 