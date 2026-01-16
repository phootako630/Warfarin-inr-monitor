import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-base text-gray-600 mb-6">{message}</p>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onCancel}
            size="lg"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            fullWidth
            onClick={onConfirm}
            size="lg"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
