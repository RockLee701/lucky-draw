import { createRouter, createWebHashHistory } from 'vue-router'
import BigScreen from './views/BigScreen.vue'
import Admin from './views/Admin.vue'
import JoinLottery from './views/JoinLottery.vue'
import SessionManage from './views/SessionManage.vue'

const routes = [
  {
    path: '/',
    name: 'BigScreen',
    component: BigScreen
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin
  },
  {
    path: '/join',
    name: 'JoinLottery',
    component: JoinLottery
  },
  {
    path: '/sessions',
    name: 'SessionManage',
    component: SessionManage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router