export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
