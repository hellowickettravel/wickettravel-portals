/** Format a number as GBP currency (no decimals for whole amounts). */
export function gbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a plain integer with thousands separators. */
export function num(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}
