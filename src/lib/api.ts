import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20_000,
})

export interface ManualPaymentInstructions {
  collection_code: string
  paybill?: string
  stanbic_account?: string
  kcb_account?: string
}

export interface PublicPaymentLink {
  code: string
  amount_cents: number
  currency: string
  merchant_name: string
  description: string
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  expires_at: string
  is_reusable: boolean
  allow_open_amount: boolean
  manual_payment?: ManualPaymentInstructions
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

export async function payWithStk(code: string, phoneNumber: string, amountCents?: number): Promise<StkPushResult> {
  const res = await http.post<StkPushResult>(`/public/org-payment-links/${code}/stkpush`, {
    phone_number: phoneNumber,
    amount_cents: amountCents,
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

export async function payWithCard(code: string, email: string, amountCents?: number): Promise<CardCheckoutResult> {
  const res = await http.post<CardCheckoutResult>(`/public/org-payment-links/${code}/pay-global`, {
    email,
    amount_cents: amountCents,
  })
  return res.data
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
