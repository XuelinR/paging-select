import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import PagingSelect from '../src'

const app = createApp(App)

app.use(ElementPlus)
app.use(PagingSelect)

app.mount('#app') 