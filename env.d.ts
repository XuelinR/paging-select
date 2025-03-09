/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 在 TypeScript 中，__dirname 在 Node.js 环境中是自动可用的
// 但在 Vite/浏览器环境中需要显式声明
declare const __dirname: string;