import { inject, type InjectionKey } from 'vue';

export type AppContext = Record<string, any>;

export const appContextKey: InjectionKey<AppContext> = Symbol('gongwei-yuwang-app-context');

export const useAppContext = (): AppContext => {
  const context = inject(appContextKey);
  if (!context) {
    throw new Error('Gongwei Yuwang app context is not available.');
  }
  return context;
};
