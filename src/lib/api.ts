import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20_000,
})

export interface ManualPaymentInstructions {
  paybill?: string
  stanbic_account?: string
  kcb_account?: string
}

export interface PublicPaymentLink {
  code: string
  name?: string
  amount_cents: number
  currency: string
  merchant_name: string
  description: string
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  expires_at: string
  is_reusable: boolean
  allow_open_amount: boolean
  manual_payment?: ManualPaymentInstructions
  // Only present when this link backs a developer-API checkout session
  // (POST /api/v1/payments/checkout/sessions) with a restricted set of
  // payment methods. Absent/empty means "no restriction" — every ordinary
  // dashboard-created payment link keeps showing all methods as before.
  allowed_rails?: string[]
  // Organization-configured checkout customisation.
  payment_image_url?: string
  header_banner_url?: string
  brand_color?: string
  image_alt?: string
  redirect_url?: string
  cancel_url?: string
  // Comma-separated: mobile_money,card,bank. Empty = all.
  payment_methods?: string
  collect_name?: boolean
  collect_phone?: boolean
  collect_email?: boolean
  require_reference?: boolean
  allow_message?: boolean
  link_type?: 'STANDARD' | 'INVOICE' | 'CUSTOMER' | 'DONATION'
  amount_mode?: 'FIXED' | 'OPEN' | 'OPTIONAL_PRESET'
  restricted_to_customer?: boolean
}

export async function fetchPaymentLink(code: string): Promise<PublicPaymentLink> {
  const res = await http.get<PublicPaymentLink>(`/public/org-payment-links/${code}`)
  return res.data
}

export interface StkPushResult {
  status: string
  message: string
  data: {
    checkout_request_id: string
    merchant_request_id: string
    customer_message: string
    provider: string
  }
}

export interface CustomerDetails {
  name?: string
  email?: string
  reference?: string
  message?: string
}

export async function payWithStk(
  code: string, phoneNumber: string, amountCents?: number, customer?: CustomerDetails,
): Promise<StkPushResult> {
  const res = await http.post<StkPushResult>(`/public/org-payment-links/${code}/stkpush`, {
    phone_number: phoneNumber,
    amount_cents: amountCents,
    customer_name: customer?.name,
    customer_email: customer?.email,
    customer_reference: customer?.reference,
    customer_message: customer?.message,
  })
  return res.data
}

export interface CardCheckoutResult {
  status: string
  data: {
    redirectUrl: string
    reference: string
    accessCode: string
    grossAmount: number
    provider: string
  }
}

export async function payWithCard(
  code: string, email: string, amountCents?: number, customer?: CustomerDetails,
): Promise<CardCheckoutResult> {
  const res = await http.post<CardCheckoutResult>(`/public/org-payment-links/${code}/pay-global`, {
    email,
    amount_cents: amountCents,
    customer_name: customer?.name,
    customer_reference: customer?.reference,
    customer_message: customer?.message,
  })
  return res.data
}

// Called from SuccessView.vue when the browser lands back from Paystack. A redirect
// alone proves nothing — this independently confirms the charge with Paystack's
// server and queues it for crediting rather than trusting the redirect itself.
export async function verifyCardPayment(code: string, reference: string): Promise<void> {
  await http.get(`/public/org-payment-links/${code}/verify`, { params: { reference } })
}

// Mirrors internal/services/fee_service.go's CalculateGrossAmount("paystack")
// exactly (1000 cents fixed fee, 4.0% provider rate) so the payer sees the
// real fee-inclusive total before paying, not an approximation.
export function estimateCardGrossAmount(netAmountCents: number): number {
  const fixedFee = 1000
  const providerRate = 0.04
  const targetNet = netAmountCents + fixedFee
  return Math.round(targetNet / (1 - providerRate))
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
    if (err.response?.status === 404) return 'This payment link could not be found.'
    if (err.response?.status === 410) return 'This payment link is no longer available.'
  }
  return 'Something went wrong. Please try again.'
}
