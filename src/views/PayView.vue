<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchPaymentLink, payWithStk, payWithCard, extractErrorMessage,
  type PublicPaymentLink,
} from '@/lib/api'
import { formatMoney } from '@/lib/format'

const route = useRoute()
const code = route.params.code as string

const loading = ref(true)
const loadError = ref<string | null>(null)
const link = ref<PublicPaymentLink | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    link.value = await fetchPaymentLink(code)
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

type Method = 'STK' | 'MANUAL' | 'CARD'
const method = ref<Method>('STK')

const openAmountKes = ref('')
const openAmountCents = computed(() => {
  if (!link.value?.allow_open_amount) return undefined
  const n = Math.round(Number(openAmountKes.value) * 100)
  return n > 0 ? n : undefined
})
const displayAmountCents = computed(() => openAmountCents.value ?? link.value?.amount_cents ?? 0)

// -- STK --
const phoneNumber = ref('')
const stkSubmitting = ref(false)
const stkError = ref<string | null>(null)
const stkSent = ref(false)
const stkPolling = ref(false)
const stkPaid = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function submitStk() {
  stkError.value = null
  if (!phoneNumber.value.trim()) {
    stkError.value = 'Enter your M-Pesa phone number.'
    return
  }
  if (link.value?.allow_open_amount && !openAmountCents.value) {
    stkError.value = `Enter an amount (min KES ${formatMoney(link.value.amount_cents)}).`
    return
  }
  stkSubmitting.value = true
  try {
    await payWithStk(code, phoneNumber.value.trim(), openAmountCents.value)
    stkSent.value = true
    if (link.value && !link.value.is_reusable) {
      stkPolling.value = true
      pollTimer = setInterval(async () => {
        try {
          const fresh = await fetchPaymentLink(code)
          if (fresh.status === 'PAID') {
            stkPaid.value = true
            stkPolling.value = false
            if (pollTimer) clearInterval(pollTimer)
          }
        } catch {
          console.log("Something went wrong")
        }
      }, 3000)
    }
  } catch (err) {
    stkError.value = extractErrorMessage(err)
  } finally {
    stkSubmitting.value = false
  }
}

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// -- Card --
const cardEmail = ref('')
const cardSubmitting = ref(false)
const cardError = ref<string | null>(null)

async function submitCard() {
  cardError.value = null
  if (link.value?.allow_open_amount && !openAmountCents.value) {
    cardError.value = `Enter an amount (min KES ${formatMoney(link.value.amount_cents)}).`
    return
  }
  cardSubmitting.value = true
  try {
    const result = await payWithCard(code, cardEmail.value.trim(), openAmountCents.value)
    window.location.href = result.data.redirectUrl
  } catch (err) {
    cardError.value = extractErrorMessage(err)
    cardSubmitting.value = false
  }
}

const manualConfirmed = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden font-sans">
    
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-md h-112 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

    <header class="z-10 flex items-center gap-2 mt-2">
      <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
        R
      </div>
      <span class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">RigePay</span>
    </header>

    <!-- Main Content Area -->
    <main class="z-10 my-auto w-full max-w-md">
      
      <!-- Loading State -->
      <div v-if="loading" class="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
        <svg class="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Loading payment details…</p>
      </div>

      <!-- Load Error State -->
      <div v-else-if="loadError" class="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-red-100 dark:border-red-900/30 text-center">
        <div class="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-500 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white mb-1">Unable to Load Payment</h2>
        <p class="text-sm text-red-600 dark:text-red-400 font-medium">{{ loadError }}</p>
      </div>

      <!-- Active Payment Card -->
      <div v-else-if="link" class="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all">
        
        <!-- Merchant & Amount Details -->
        <div class="p-6 pb-5 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 mb-2">
            Payment Request
          </span>
          
          <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {{ link.merchant_name }}
          </h1>
          
          <p v-if="link.description" class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {{ link.description }}
          </p>

          <!-- Amount Display -->
          <div class="mt-4">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Amount</span>
            <div class="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              <span class="text-lg text-slate-400 dark:text-slate-500 font-semibold mr-0.5">KES</span>
              {{ formatMoney(displayAmountCents) }}
            </div>
          </div>

          <!-- Metadata Tags -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs">
            <span v-if="link.allow_open_amount" class="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
              Min: KES {{ formatMoney(link.amount_cents) }}
            </span>
            <span v-if="link.is_reusable" class="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reusable link
            </span>
          </div>
        </div>

        <!-- Segmented Tab Navigation -->
        <div class="p-2 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80">
          <div class="grid grid-cols-3 gap-1">
            <button
              type="button"
              class="py-2 text-xs font-semibold rounded-xl transition-all duration-200"
              :class="method === 'STK' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              @click="method = 'STK'"
            >
              M-Pesa
            </button>
            <button
              type="button"
              class="py-2 text-xs font-semibold rounded-xl transition-all duration-200"
              :class="method === 'MANUAL' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              @click="method = 'MANUAL'"
            >
              Manual Pay
            </button>
            <button
              type="button"
              class="py-2 text-xs font-semibold rounded-xl transition-all duration-200"
              :class="method === 'CARD' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              @click="method = 'CARD'"
            >
              Card
            </button>
          </div>
        </div>

        <!-- Method Content Container -->
        <div class="p-6">
          
          <!-- Open Amount Custom Input -->
          <div v-if="link.allow_open_amount" class="mb-5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter Custom Amount (KES)
            </label>
            <div class="relative">
              <input
                v-model="openAmountKes" 
                type="number" 
                :placeholder="`Min ${formatMoney(link.amount_cents)}`"
                class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- M-PESA (STK) TAB -->
          <div v-if="method === 'STK'">
            <!-- Paid Success State -->
            <div v-if="stkPaid" class="text-center py-6">
              <div class="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Payment Received!</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Thank you for your payment.</p>
            </div>

            <!-- Prompt Sent / Polling State -->
            <div v-else-if="stkSent" class="text-center py-4 space-y-3">
              <div class="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-blue-600 rounded-full flex items-center justify-center mx-auto relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div class="space-y-1">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Check Your Phone</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  An M-Pesa prompt was sent to your phone. Enter your M-Pesa PIN to complete the transaction.
                </p>
              </div>

              <div class="pt-2">
                <span v-if="stkPolling" class="inline-flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Waiting for confirmation…
                </span>
                <p v-else class="text-xs text-slate-400">
                  We'll credit this payment once received. You can safely close this page.
                </p>
              </div>
            </div>

            <!-- Initial Form -->
            <form v-else class="space-y-4" @submit.prevent="submitStk">
              <div v-if="stkError" class="p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 rounded-xl text-xs font-medium text-red-600 dark:text-red-400">
                {{ stkError }}
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  M-Pesa Phone Number
                </label>
                <div class="relative">
                  <input
                    v-model="phoneNumber" 
                    type="tel" 
                    placeholder="e.g. 0712345678 or 2547..."
                    class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit" 
                :disabled="stkSubmitting"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm py-3 rounded-xl transition-colors duration-200 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                <svg v-if="stkSubmitting" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ stkSubmitting ? 'Sending Prompt…' : 'Pay with M-Pesa' }}</span>
              </button>
            </form>
          </div>

          <!-- MANUAL PAYMENT TAB -->
          <div v-else-if="method === 'MANUAL'" class="space-y-4">
            
            <!-- Paybill Box -->
            <div v-if="link.manual_payment?.paybill" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">M-Pesa Paybill</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-400 block">Business No:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.paybill }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Account No:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.collection_code }}</span>
                </div>
              </div>
            </div>

            <!-- Stanbic Box -->
            <div v-if="link.manual_payment?.stanbic_account" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">Bank Transfer — Stanbic</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-400 block">Account:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.stanbic_account }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Reference:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.collection_code }}</span>
                </div>
              </div>
            </div>

            <!-- KCB Box -->
            <div v-if="link.manual_payment?.kcb_account" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">Bank Transfer — KCB</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-400 block">Account:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.kcb_account }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Reference:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{{ link.manual_payment.collection_code }}</span>
                </div>
              </div>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
              💡 Always use the reference/account number above exactly as shown to ensure your payment is credited.
            </p>

            <button
              v-if="!manualConfirmed" 
              type="button"
              class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm py-3 rounded-xl transition-colors duration-200"
              @click="manualConfirmed = true"
            >
              I have completed payment
            </button>
            
            <div v-else class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-center">
              <p class="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Thanks — we'll confirm your payment once received. You can safely close this page.
              </p>
            </div>
          </div>

          <!-- CARD PAYMENT TAB -->
          <div v-else class="space-y-4">
            <div v-if="cardError" class="p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 rounded-xl text-xs font-medium text-red-600 dark:text-red-400">
              {{ cardError }}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (for receipt)
              </label>
              <input
                v-model="cardEmail" 
                type="email" 
                placeholder="you@example.com"
                class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              type="button" 
              :disabled="cardSubmitting" 
              @click="submitCard"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm py-3 rounded-xl transition-colors duration-200 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              <svg v-if="cardSubmitting" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ cardSubmitting ? 'Redirecting to Checkout…' : 'Pay with Card' }}</span>
            </button>
          </div>

        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="z-10 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>256-Bit SSL Encryption • Powered by RigePay</span>
    </footer>

  </div>
</template>