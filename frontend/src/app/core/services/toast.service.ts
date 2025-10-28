import { Injectable, Signal, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  description?: string;
  duration?: number;
  closable?: boolean;
}

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  description?: string;
  closable: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  get toasts(): Signal<Toast[]> {
    return this.toastsSignal.asReadonly();
  }

  success(message: string, options?: ToastOptions): number {
    return this.push('success', message, options);
  }

  error(message: string, options?: ToastOptions): number {
    return this.push('error', message, options);
  }

  info(message: string, options?: ToastOptions): number {
    return this.push('info', message, options);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.toastsSignal.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  clear(): void {
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
    this.toastsSignal.set([]);
  }

  private push(type: ToastType, message: string, options?: ToastOptions): number {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      type,
      message,
      description: options?.description,
      closable: options?.closable ?? true
    };

    this.toastsSignal.update(toasts => [...toasts, toast]);

    const duration = options?.duration ?? 4000;
    if (duration > 0) {
      const timeout = setTimeout(() => this.dismiss(id), duration);
      this.timers.set(id, timeout);
    }

    return id;
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}

