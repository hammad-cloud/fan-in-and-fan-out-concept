export const rs = (n) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`

export const pctOff = (r) => (r.originalPrice > r.price ? Math.round((1 - r.price / r.originalPrice) * 100) : 0)

// "Gul Ahmed" -> "GA", "Al-Fatah" -> "AF", "PriceOye" -> "P"
export const initials = (name) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
