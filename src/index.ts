import PagingSelect from './index.vue';
import type { App } from 'vue';

// 导出组件
export { PagingSelect };

// 导出默认对象，用于Vue插件安装
export default {
  install(app: App) {
    app.component(PagingSelect.name, PagingSelect);
  }
}; 