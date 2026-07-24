<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchPaymentLink, payWithStk, payWithCard, estimateCardGrossAmount, extractErrorMessage,
  type PublicPaymentLink,
} from '@/lib/api'
import { formatMoney } from '@/lib/format'

const route = useRoute()
const code = route.params.code as string


const cardReturnStatus = (route.query.payment as string) || null

const loading = ref(true)
const loadError = ref<string | null>(null)
const link = ref<PublicPaymentLink | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    link.value = await fetchPaymentLink(code)
    if (link.value.manual_payment?.paybill) manualSubMethod.value = 'MPESA'
    else if (link.value.manual_payment?.stanbic_account) manualSubMethod.value = 'STANBIC'
    else if (link.value.manual_payment?.kcb_account) manualSubMethod.value = 'KCB'
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await load()
  if (cardReturnStatus === 'success') {
    selectedMethod.value = 'CARD'
    if (link.value?.status === 'PAID') {
      stkPaid.value = true
    } else {
      startPoll()
    }
  } else if (cardReturnStatus === 'error') {
    selectedMethod.value = 'CARD'
    cardError.value = 'Your card payment was not completed. You can try again or use another method.'
  }
})

type Method = 'MPESA' | 'CARD' | 'MANUAL'
const selectedMethod = ref<Method>('MPESA')

const openAmountKes = ref('')
const openAmountCents = computed(() => {
  if (!link.value?.allow_open_amount) return undefined
  const n = Math.round(Number(openAmountKes.value) * 100)
  return n > 0 ? n : undefined
})
const baseAmountCents = computed(() => openAmountCents.value ?? link.value?.amount_cents ?? 0)


const cardTotalCents = computed(() => estimateCardGrossAmount(baseAmountCents.value))
const displayTotalCents = computed(() => selectedMethod.value === 'CARD' ? cardTotalCents.value : baseAmountCents.value)
const cardFeeCents = computed(() => cardTotalCents.value - baseAmountCents.value)

const form = reactive({ phone: '', email: '' })

function copy(text: string) {
  navigator.clipboard?.writeText(text)
}

const stkSubmitting = ref(false)
const stkError = ref<string | null>(null)
const stkPolling = ref(false)
const stkPaid = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPoll() {
  if (!link.value || link.value.is_reusable) return
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
      console.log("Failed to Poll")
    }
  }, 3000)
}
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

async function handleMpesaPay() {
  stkError.value = null
  const cleanPhone = form.phone.replace(/\D/g, '')
  if (cleanPhone.length < 9) {
    stkError.value = 'Enter a valid M-Pesa phone number.'
    return
  }
  if (link.value?.allow_open_amount && !openAmountCents.value) {
    stkError.value = `Enter an amount (min KES ${formatMoney(link.value.amount_cents)}).`
    return
  }
  stkSubmitting.value = true
  try {
    await payWithStk(code, cleanPhone, openAmountCents.value)
    startPoll()
  } catch (err) {
    stkError.value = extractErrorMessage(err)
  } finally {
    stkSubmitting.value = false
  }
}

const cardSubmitting = ref(false)
const cardError = ref<string | null>(null)

async function handleGlobalPay() {
  cardError.value = null
  if (!form.email) {
    cardError.value = 'Enter your email to receive a receipt.'
    return
  }
  if (link.value?.allow_open_amount && !openAmountCents.value) {
    cardError.value = `Enter an amount (min KES ${formatMoney(link.value.amount_cents)}).`
    return
  }
  cardSubmitting.value = true
  try {
    const result = await payWithCard(code, form.email, openAmountCents.value)
    window.location.href = result.data.redirectUrl
  } catch (err) {
    cardError.value = extractErrorMessage(err)
    cardSubmitting.value = false
  }
}

type ManualSubMethod = 'MPESA' | 'STANBIC' | 'KCB'
const manualSubMethod = ref<ManualSubMethod>('MPESA')

const manualOptions = computed(() => {
  const opts: { key: ManualSubMethod; label: string; icon: string }[] = []
  if (link.value?.manual_payment?.paybill) opts.push({ key: 'MPESA', label: 'M-Pesa Paybill', icon: '📲' })
  if (link.value?.manual_payment?.stanbic_account) opts.push({ key: 'STANBIC', label: 'Stanbic Bank', icon: '🏦' })
  if (link.value?.manual_payment?.kcb_account) opts.push({ key: 'KCB', label: 'KCB Bank', icon: '🏦' })
  return opts
})

const manualConfirmed = ref(false)
function startManualPoll() {
  manualConfirmed.value = true
  startPoll()
}
</script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] font-sans text-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-212.5">

      <div v-if="loading" class="bg-white rounded-2xl shadow-xl p-10 text-center border border-slate-200">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-bold text-slate-500 animate-pulse">Loading Payment Details...</p>
      </div>

      <div v-else-if="loadError || !link" class="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 max-w-120 mx-auto">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">✕</div>
        <h2 class="text-xl font-bold text-slate-900 mb-2">Link Unavailable</h2>
        <p class="text-slate-500 text-sm mb-6">{{ loadError || "Invalid or expired payment link." }}</p>
      </div>

      <div v-else class="bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row min-h-137.5">

        <!-- Sidebar -->
        <div class="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
          <header class="bg-[#111827] text-white p-6 relative overflow-hidden shrink-0">
            <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-emerald-500"></div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Paying To</span>
            <h1 class="text-lg font-bold mt-3 leading-tight truncate">{{ link.merchant_name }}</h1>

            <div class="mt-4 flex items-baseline gap-1">
              <span class="text-xs font-bold text-slate-400">{{ link.currency }}</span>
              <span class="text-3xl font-black tracking-tight">{{ formatMoney(displayTotalCents) }}</span>
            </div>
            <p v-if="link.is_reusable" class="text-[10px] text-slate-400 mt-1">Accepts repeat payments</p>
          </header>

          <div class="p-4 grow">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Select Payment Method</p>
            <nav class="space-y-2">
              <button
                v-for="method in (['MPESA', 'CARD', 'MANUAL'] as Method[])"
                :key="method"
                type="button"
                @click="selectedMethod = method"
                :class="[
                  'w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all text-sm border-2',
                  selectedMethod === method
                    ? 'bg-white border-blue-600 text-blue-600 shadow-sm'
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100',
                ]"
              >
                <span class="text-xl">
                  <span v-if="method === 'MPESA'">📲</span>
                  <span v-if="method === 'CARD'">💳</span>
                  <span v-if="method === 'MANUAL'">🏦</span>
                </span>
                <span>{{ method === 'CARD' ? 'Card / Mobile Money' : method === 'MPESA' ? 'M-Pesa' : 'Manual Transfer' }}</span>
                <div v-if="selectedMethod === method" class="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              </button>
            </nav>
          </div>

          <footer class="p-6 mt-auto border-t border-slate-200">
            <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
              Secured by RigePay
            </div>
          </footer>
        </div>

        <!-- Main -->
        <div class="grow p-6 md:p-10 relative overflow-y-auto">
          <div class="flex justify-between items-center text-xs mb-8 pb-4 border-b border-slate-100">
            <div class="flex flex-col">
              <span class="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Description</span>
              <span class="font-semibold text-slate-700">{{ link.description || '—' }}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Ref</span>
              <span class="font-mono font-bold text-slate-900">{{ link.code }}</span>
            </div>
          </div>

          <div v-if="stkPaid" class="text-center fade-in py-10">
            <div class="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-500/30">✓</div>
            <h3 class="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h3>
            <p class="text-slate-500 text-sm mb-6">We have confirmed your payment.</p>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left space-y-3 max-w-sm mx-auto">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 font-medium">Amount Paid</span>
                <span class="font-bold text-slate-900">KES {{ formatMoney(displayTotalCents) }}</span>
              </div>
              <div class="flex justify-between text-sm border-t border-slate-200 pt-3">
                <span class="text-slate-500 font-medium">Reference</span>
                <span class="font-mono font-bold text-slate-900">{{ link.code }}</span>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-if="link.allow_open_amount" class="mb-6">
              <label class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                Amount (KES) — min {{ formatMoney(link.amount_cents) }}
              </label>
              <input
                v-model="openAmountKes" type="number" :placeholder="formatMoney(link.amount_cents)"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div v-if="selectedMethod === 'CARD' && cardFeeCents > 0" class="mb-6">
              <span class="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                Includes processing fee: KES {{ formatMoney(cardFeeCents) }}
              </span>
            </div>

            <!-- M-Pesa -->
            <div v-if="selectedMethod === 'MPESA'" class="space-y-6 fade-in-up">
              <div v-if="stkPolling" class="text-center py-12 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div class="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p class="font-bold text-emerald-900">Checking Status...</p>
                <p class="text-sm text-emerald-600 mt-2 px-6">Please enter your M-Pesa PIN on the prompt sent to your phone.</p>
              </div>
              <form v-else @submit.prevent="handleMpesaPay" class="space-y-6">
                <div v-if="stkError" class="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{{ stkError }}</div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">M-Pesa Phone Number</label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🇰🇪</span>
                    <input
                      type="tel" v-model="form.phone" placeholder="07XX XXX XXX"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      required
                    />
                  </div>
                </div>
                <button type="submit" :disabled="stkSubmitting" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-60">
                  {{ stkSubmitting ? 'Processing...' : `Pay ${formatMoney(displayTotalCents)}` }}
                </button>
                <div class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span class="text-lg">💡</span>
                  <p class="text-xs text-slate-500 leading-relaxed">After clicking pay, you will receive an STK push on your phone. Enter your PIN to complete the transaction.</p>
                </div>
              </form>
            </div>

            <!-- Card -->
            <div v-if="selectedMethod === 'CARD'" class="space-y-6 fade-in-up">
              <div v-if="cardError" class="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{{ cardError }}</div>
              <p class="text-sm text-slate-600">Enter your email to receive a payment receipt after the card transaction.</p>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Receipt Email Address</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg">✉️</span>
                  <input
                    type="email" v-model="form.email" placeholder="name@example.com"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>
              <button type="button" @click="handleGlobalPay" :disabled="cardSubmitting || !form.email" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-60">
                {{ cardSubmitting ? 'Redirecting...' : `Pay ${formatMoney(displayTotalCents)}` }}
              </button>
              <p class="text-[11px] text-slate-400 text-center">
                Total includes a processing fee of KES {{ formatMoney(cardFeeCents) }} — you'll pay
                KES {{ formatMoney(displayTotalCents) }} in total.
              </p>
            </div>

            <!-- Manual -->
            <div v-if="selectedMethod === 'MANUAL'" class="space-y-6 fade-in-up">
              <div v-if="!manualOptions.length" class="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
                Manual payment isn't set up for this link yet.
              </div>

              <template v-else>
                <div class="flex gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    v-for="opt in manualOptions" :key="opt.key" type="button"
                    @click="manualSubMethod = opt.key"
                    :class="[
                      'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg py-2 transition-all',
                      manualSubMethod === opt.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700',
                    ]"
                  >
                    <span>{{ opt.icon }}</span>{{ opt.label }}
                  </button>
                </div>

                <div v-if="manualSubMethod === 'MPESA' && link.manual_payment?.paybill" class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div class="bg-[#1cb251]/10 px-4 py-3 border-b border-[#1cb251]/20 flex items-center gap-2">
                    <span class="text-lg">📲</span>
                    <span class="text-xs font-bold text-[#1cb251] uppercase tracking-wide">M-Pesa Paybill Steps</span>
                  </div>
                  <div class="p-5 text-sm">
                    <ol class="space-y-3 text-slate-600 list-decimal list-inside">
                      <li>Go to M-Pesa menu or dial <span class="font-bold text-slate-900">*334#</span></li>
                      <li>Select <span class="font-semibold text-slate-800">Lipa na M-Pesa</span></li>
                      <li>Select <span class="font-semibold text-slate-800">Paybill</span></li>
                      <li>Enter Business No:
                        <span class="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200" @click="copy(link.manual_payment.paybill!)">{{ link.manual_payment.paybill }}</span>
                      </li>
                      <li>Enter Account No:
                        <span class="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100" @click="copy(link.code)">{{ link.code }}</span>
                      </li>
                      <li>Enter Amount: <span class="font-bold text-slate-900">{{ link.currency }} {{ formatMoney(baseAmountCents) }}</span></li>
                      <li>Enter your <span class="font-semibold text-slate-800">PIN</span> to authorize</li>
                    </ol>
                  </div>
                </div>

                <div v-else-if="manualSubMethod === 'STANBIC' && link.manual_payment?.stanbic_account" class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div class="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                    <span class="text-lg">🏦</span>
                    <span class="text-xs font-bold text-blue-600 uppercase tracking-wide">Bank Transfer — Stanbic</span>
                  </div>
                  <div class="p-5 text-sm">
                    <ol class="space-y-3 text-slate-600 list-decimal list-inside">
                      <li>Open your bank app or dial your bank <span class="font-semibold text-slate-800">USSD code</span></li>
                      <li>Select <span class="font-semibold text-slate-800">Fund Transfer / PesaLink</span></li>
                      <li>Select <span class="font-semibold text-slate-800">Stanbic Bank</span></li>
                      <li>Enter Account:
                        <span class="font-mono font-bold text-slate-900 cursor-pointer hover:underline" @click="copy(link.manual_payment.stanbic_account!)">{{ link.manual_payment.stanbic_account }}</span>
                      </li>
                      <li>Enter Account Ref (Naration):
                        <span class="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100" @click="copy(link.code)">{{ link.code }}</span>
                      </li>
                      <li>Enter Amount: <span class="font-bold text-slate-900">{{ link.currency }} {{ formatMoney(baseAmountCents) }}</span></li>
                      <li>Enter your <span class="font-semibold text-slate-800">PIN</span> to authorize</li>
                    </ol>
                  </div>
                </div>

                <div v-else-if="manualSubMethod === 'KCB' && link.manual_payment?.kcb_account" class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div class="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
                    <span class="text-lg">🏦</span>
                    <span class="text-xs font-bold text-indigo-600 uppercase tracking-wide">Bank Transfer — KCB</span>
                  </div>
                  <div class="p-5 text-sm">
                    <ol class="space-y-3 text-slate-600 list-decimal list-inside">
                      <li>Open your bank app or dial your bank <span class="font-semibold text-slate-800">USSD code</span></li>
                      <li>Select <span class="font-semibold text-slate-800">Fund Transfer / PesaLink</span></li>
                      <li>Select <span class="font-semibold text-slate-800">KCB Bank</span></li>
                      <li>Enter Account:
                        <span class="font-mono font-bold text-slate-900 cursor-pointer hover:underline" @click="copy(link.manual_payment.kcb_account!)">{{ link.manual_payment.kcb_account }}</span>
                      </li>
                      <li>Enter Account Ref (Naration):
                        <span class="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100" @click="copy(link.code)">{{ link.code }}</span>
                      </li>
                      <li>Enter Amount: <span class="font-bold text-slate-900">{{ link.currency }} {{ formatMoney(baseAmountCents) }}</span></li>
                      <li>Enter your <span class="font-semibold text-slate-800">PIN</span> to authorize</li>
                    </ol>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-4">
                  <span class="text-2xl">⚠️</span>
                  <p class="text-[11px] text-amber-800 leading-relaxed font-bold">
                    IMPORTANT: You must use the reference "{{ link.code }}" exactly as shown above for your payment to be detected automatically.
                  </p>
                </div>

                <button
                  type="button" @click="startManualPoll" :disabled="stkPolling"
                  class="w-full py-4 border-2 border-slate-900 text-slate-900 font-bold rounded-xl hover:bg-slate-900 hover:text-white transition-all text-sm disabled:opacity-60"
                >
                  {{ stkPolling ? 'Verifying Payment...' : manualConfirmed ? "We'll confirm once received" : 'I have Completed Payment' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-in-up {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-in {
  animation: fadeIn 0.6s ease-out;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
