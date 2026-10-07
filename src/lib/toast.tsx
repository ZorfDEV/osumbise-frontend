import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  // Toast "Annuler" : durée affichée par la barre de progression
  undoMs?: number;
}

interface UndoableOptions {
  // Exécutée à la fin du délai si l'utilisateur n'a pas annulé
  onCommit: () => void | Promise<void>;
  // Exécutée si l'utilisateur clique "Annuler"
  onUndo?: () => void;
  durationMs?: number;
}

interface ToastContextValue {
  notify: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  // Remplace une fenêtre de confirmation : l'action est appliquée à l'écran
  // tout de suite, et réellement exécutée après quelques secondes sauf si
  // l'utilisateur clique "Annuler".
  undoable: (message: string, options: UndoableOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: typeof CheckCircle2 }
> = {
  success: { bg: 'bg-success-soft', border: 'border-success/30', text: 'text-success-dark', icon: CheckCircle2 },
  error: { bg: 'bg-danger-soft', border: 'border-danger/30', text: 'text-danger-dark', icon: XCircle },
  info: { bg: 'bg-info-soft', border: 'border-info/30', text: 'text-info-dark', icon: Info },
  warning: { bg: 'bg-warning-soft', border: 'border-warning/30', text: 'text-warning-dark', icon: AlertTriangle },
};

const DURATION_MS = 4500;
const UNDO_MS = 5000;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Actions "annulables" en attente, par id de toast
  const pending = useRef(new Map<string, { timer: number; options: UndoableOptions }>());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const commit = useCallback(
    (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      window.clearTimeout(entry.timer);
      remove(id);
      void entry.options.onCommit();
    },
    [remove]
  );

  const undo = useCallback(
    (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      window.clearTimeout(entry.timer);
      remove(id);
      entry.options.onUndo?.();
    },
    [remove]
  );

  // Si l'onglet se ferme pendant le délai, on exécute tout de suite les
  // actions en attente plutôt que de les perdre silencieusement.
  useEffect(() => {
    const flush = () => [...pending.current.keys()].forEach(commit);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [commit]);

  const undoable = useCallback(
    (message: string, options: UndoableOptions) => {
      const id = crypto.randomUUID();
      const undoMs = options.durationMs ?? UNDO_MS;
      const timer = window.setTimeout(() => commit(id), undoMs);
      pending.current.set(id, { timer, options });
      setToasts((prev) => [...prev, { id, type: 'info', message, undoMs }]);
    },
    [commit]
  );

  const notify = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), DURATION_MS);
    },
    [remove]
  );

  const value: ToastContextValue = {
    notify,
    success: (message) => notify('success', message),
    error: (message) => notify('error', message),
    info: (message) => notify('info', message),
    warning: (message) => notify('warning', message),
    undoable,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-toast-in pointer-events-auto relative flex w-full max-w-sm items-start gap-2 overflow-hidden rounded-lg border p-3 shadow-md sm:w-96 ${style.bg} ${style.border}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${style.text}`} />
              <p className={`flex-1 text-sm ${style.text}`}>{t.message}</p>
              {t.undoMs !== undefined && (
                <>
                  <button
                    onClick={() => undo(t.id)}
                    className={`-my-1 shrink-0 rounded-md px-2 py-1 text-sm font-bold underline underline-offset-4 hover:bg-black/5 ${style.text}`}
                  >
                    Annuler
                  </button>
                  <span
                    aria-hidden="true"
                    className={`animate-toast-countdown absolute inset-x-0 bottom-0 h-0.5 bg-current opacity-40 ${style.text}`}
                    style={{ animationDuration: `${t.undoMs}ms` }}
                  />
                </>
              )}
              <button
                onClick={() => (t.undoMs !== undefined ? commit(t.id) : remove(t.id))}
                aria-label="Fermer"
                className={`shrink-0 opacity-60 hover:opacity-100 ${style.text}`}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l’intérieur de <ToastProvider>');
  }
  return ctx;
};
