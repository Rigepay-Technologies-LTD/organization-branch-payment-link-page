<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPaymentLink, extractErrorMessage, type PublicPaymentLink } from '@/lib/api'
import { formatMoney } from '@/lib/format'

const route = useRoute()
const code = (route.query.code as string) || ''

const loading = ref(true)
const loadError = ref<string | null>(null)
const link = ref<PublicPaymentLink | null>(null)

onMounted(async () => {
  if (!code) {
    loadError.value = 'Missing payment reference.'
    loading.value = false
    return
  }
  try {
    link.value = await fetchPaymentLink(code)
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] font-sans text-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
      <div v-if="loading" class="py-6">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-bold text-slate-500 animate-pulse">Confirming payment…</p>
      </div>

      <template v-else>
        <div class="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-500/30">✓</div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h1>
        <p class="text-slate-500 text-sm mb-6">We've confirmed your payment.</p>

        <div v-if="link" class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-slate-500 font-medium">Amount Paid</span>
            <span class="font-bold text-slate-900">{{ link.currency }} {{ formatMoney(link.amount_cents) }}</span>
          </div>
          <div class="flex justify-between text-sm border-t border-slate-200 pt-3">
            <span class="text-slate-500 font-medium">Reference</span>
            <span class="font-mono font-bold text-slate-900">{{ code }}</span>
          </div>
          <div class="flex justify-between text-sm border-t border-slate-200 pt-3">
            <span class="text-slate-500 font-medium">Paid To</span>
            <span class="font-bold text-slate-900">{{ link.merchant_name }}</span>
          </div>
        </div>
        <div v-else-if="loadError" class="text-xs text-slate-400">{{ loadError }}</div>

        <div class="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          Secured by RigePay
        </div>
      </template>
    </div>
  </div>
</template>
