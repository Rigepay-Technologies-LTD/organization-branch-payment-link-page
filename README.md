# rigepay-pay

Standalone public checkout site for RigePay organization/branch payment
links — deployed at **pay.rigepay.co.ke**.

This is deliberately a separate project from `rigepay-public` (the
merchant-only checkout site). It talks only to the isolated
`/api/v1/public/org-payment-links/*` backend routes and never shares code
or routes with the merchant checkout flow.

## Payment methods

- **M-Pesa STK push** — live push to the payer's phone, confirmed via
  polling for single-use links.
- **Manual payment** — M-Pesa paybill and Stanbic/KCB bank transfer
  instructions, referenced by the org/branch's own collection code. Not
  auto-confirmed in real time (shared-paybill architecture) — the page asks
  the payer to confirm, and settlement happens via the normal collection
  pipeline.
- **Card** — Paystack/Cashia hosted checkout redirect.

## Development

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # type-checks (vue-tsc) then builds
```

Configure the backend API base URL via `VITE_API_BASE_URL` — see
`.env.example`. `.env.development` and `.env.production` are committed
(no secrets, just public API URLs); `.env.production`'s API domain is a
placeholder pending confirmation of the real production domain.
