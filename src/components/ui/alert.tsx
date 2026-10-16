import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TOAST_STYLES, type ToastType } from '@/lib/toast';

// Bandeau fixe dans la page, au même style que les notifications (toasts) :
// mêmes couleurs et mêmes icônes par type, l'icône pouvant être remplacée.
export default function Alert({
  type,
  title,
  icon,
  children,
  className = '',
}: {
  type: ToastType;
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}) {
  const style = TOAST_STYLES[type];
  const Icon = icon ?? style.icon;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border p-3 shadow-sm ${style.bg} ${style.border} ${className}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${style.text}`} aria-hidden />
      <div className={`flex-1 text-sm ${style.text}`}>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}
