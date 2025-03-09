import { DefineComponent } from 'vue';

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare function defineProps<T>(props: T): T;
declare function defineEmits<T extends string[]>(emits: T): (event: T[number], ...args: any[]) => void;
declare function defineOptions(options: Record<string, any>): void;

// 添加Element Plus相关类型
declare interface ElSelect {}
declare interface ElOption {} 