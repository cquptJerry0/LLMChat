import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import piniaPlugin from './stores'
import './styles/index.scss'
const app = createApp(App)
app.use(piniaPlugin)
app.use(router)

app.mount('#app')
