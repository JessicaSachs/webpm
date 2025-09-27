import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import Playground from './views/Playground.vue'
import App from './App.vue'
import './assets/main.css'

const app = createApp(App)

const router = createRouter({
  routes: [
    {
      path: '/',
      component: Playground,
    },
  ],
  history: createWebHistory(),
})

app.use(router)
app.use(ui)

app.mount('#root')
