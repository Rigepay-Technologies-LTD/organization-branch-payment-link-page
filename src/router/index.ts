import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    // Dedicated success/error screens for the card-return redirect from
    // Paystack/Cashia — isolated from the merchant checkout site's own
    // success/error screens (rigepay-public) and from rigepay-checkout's
    // (the developer-API checkout-session flow). Declared before the
    // catch-all /:code route so they take priority.
    {
      path: '/success',
      name: 'pay-success',
      component: () => import('@/views/SuccessView.vue'),
    },
    {
      path: '/error',
      name: 'pay-error',
      component: () => import('@/views/ErrorView.vue'),
    },
    {
      path: '/:code',
      name: 'pay',
      component: () => import('@/views/PayView.vue'),
    },
  ],
})

export default router
