<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const code = (route.query.code as string) || ''
const retryLink = computed(() => (code ? `/${code}` : '/'))
</script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] font-sans text-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
      <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-red-100">✕</div>
      <h1 class="text-2xl font-black text-slate-900 mb-2">Payment Not Completed</h1>
      <p class="text-slate-500 text-sm mb-8">
        Your card payment was not completed. You have not been charged. You can try again or use another method.
      </p>

      <a
        v-if="code"
        :href="retryLink"
        class="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
      >
        Try Again
      </a>

      <div class="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
        Secured by RigePay
      </div>
    </div>
  </div>
</template>
