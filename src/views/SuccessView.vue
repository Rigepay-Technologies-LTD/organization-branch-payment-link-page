<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPaymentLink, verifyCardPayment, extractErrorMessage, type PublicPaymentLink } from '@/lib/api'
import { formatMoney } from '@/lib/format'

const route = useRoute()
const code = (route.query.code as string) || ''
// Paystack's Standard Checkout has exactly one callback URL — it redirects here on
// decline and cancellation too, not just success (our own FailureURL is only wired
// for Cashia, never Paystack). So this page — not a separate /error route — must be
// able to detect and show a genuine failure, not just spin on "confirming" forever.
const reference = (route.query.reference as string) || (route.query.trxref as string) || ''

type Status = 'loading' | 'confirming' | 'success' | 'failed'
const status = ref<Status>('loading')
const failMessage = ref<string | null>(null)
const link = ref<PublicPaymentLink | null>(null)
const redirectCountdown = ref(0)
let redirectTimer: ReturnType<typeof setInterval> | null = null

function maybeRedirect() {
  const url = link.value?.redirect_url
  if (!url) return
  redirectCountdown.value = 5
  redirectTimer = setInterval(() => {
    redirectCountdown.value -= 1
    if (redirectCountdown.value <= 0) {
      if (redirectTimer) clearInterval(redirectTimer)
      window.location.href = url
    }
  }, 1000)
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollAttempts = 0
const MAX_POLL_ATTEMPTS = 20 // ~60s at 3s intervals

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPoll() {
  status.value = 'confirming'
  pollAttempts = 0
  pollTimer = setInterval(async () => {
    pollAttempts += 1
    try {
      const fresh = await fetchPaymentLink(code)
      link.value = fresh
      if (fresh.status === 'PAID') {
        status.value = 'success'
        stopPoll()
      } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        stopPoll()
        // Not necessarily failed — the webhook/queue may just be slow. Stay on the
        // confirming screen (it shows a "taking longer than usual" note below) rather
        // than falsely declaring failure for what's often just a delay.
      }
    } catch {
      // transient fetch error — keep polling, don't abandon the wait over one blip
    }
  }, 3000)
}

async function loadLink() {
  try {
    link.value = await fetchPaymentLink(code)
    if (link.value.status === 'PAID' || link.value.is_reusable) {
      status.value = 'success'
    } else {
      startPoll()
    }
  } catch (err) {
    status.value = 'failed'
    failMessage.value = extractErrorMessage(err)
  }
}

onMounted(async () => {
  if (!code) {
    status.value = 'failed'
    failMessage.value = 'Missing payment reference.'
    return
  }

  if (reference) {
    try {
      // Independently confirm the charge with Paystack's server — a redirect landing
      // here proves nothing on its own. A failure here means Paystack itself reported
      // the charge as unsuccessful (decline, cancellation, etc.), which is a genuine
      // failure worth showing immediately, not something to silently poll past.
      await verifyCardPayment(code, reference)
    } catch (err) {
      status.value = 'failed'
      failMessage.value = extractErrorMessage(err)
      // Still check the link's real status once — the real webhook may have already
      // succeeded even though this particular verify call failed (e.g. already
      // processed, or a transient network issue talking to Paystack).
      try {
        const fresh = await fetchPaymentLink(code)
        link.value = fresh
        if (fresh.status === 'PAID') {
          status.value = 'success'
          failMessage.value = null
        }
      } catch {
        // keep the failed state from the verify call above
      }
      return
    }
  }

  await loadLink()
})

watch(status, (s) => {
  if (s === 'success') maybeRedirect()
})

onUnmounted(() => {
  stopPoll()
  if (redirectTimer) clearInterval(redirectTimer)
})
</script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] font-sans text-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
      <div v-if="status === 'loading'" class="py-6">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-bold text-slate-500 animate-pulse">Confirming payment…</p>
      </div>

      <template v-else-if="status === 'confirming'">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h1 class="text-xl font-black text-slate-900 mb-2">Confirming your payment…</h1>
        <p class="text-slate-500 text-sm">This usually takes just a few seconds. Don't close this page.</p>
        <p v-if="pollAttempts >= MAX_POLL_ATTEMPTS" class="text-xs text-amber-600 font-semibold mt-4">
          This is taking longer than usual. You'll be credited automatically once it clears — no need to retry the payment.
        </p>
      </template>

      <template v-else-if="status === 'failed'">
        <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 border border-red-100">✕</div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">Payment Not Completed</h1>
        <p class="text-slate-500 text-sm mb-6">{{ failMessage || 'We could not confirm this payment.' }}</p>
        <RouterLink
          v-if="code"
          :to="{ name: 'pay', params: { code } }"
          class="inline-block px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors"
        >
          Try again
        </RouterLink>
      </template>

      <template v-else>
        <div class="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-500/30">✓</div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h1>
        <p class="text-slate-500 text-sm mb-6">We've confirmed your payment.</p>
        <p v-if="redirectCountdown > 0" class="text-xs text-slate-400 mb-4">
          Returning to the merchant in {{ redirectCountdown }}s…
        </p>

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

        <div class="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          Secured by RigePay
        </div>
      </template>
    </div>
  </div>
</template>
