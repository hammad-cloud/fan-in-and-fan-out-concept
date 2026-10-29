import { initials, pctOff, rs } from './format'

test('rs formats rupees rounded with thousands separators', () => {
  expect(rs(21300)).toBe('Rs. 21,300')
  expect(rs(74.6)).toBe('Rs. 75')
  expect(rs(0)).toBe('Rs. 0')
})

test('pctOff only reports a real discount', () => {
  expect(pctOff({ price: 750, originalPrice: 1000 })).toBe(25)
  expect(pctOff({ price: 1000, originalPrice: 1000 })).toBe(0)
  expect(pctOff({ price: 1000, originalPrice: 800 })).toBe(0)
  expect(pctOff({ price: 1000, originalPrice: null })).toBe(0)
})

test('initials takes the first letter of up to two words', () => {
  expect(initials('Gul Ahmed')).toBe('GA')
  expect(initials('Al-Fatah')).toBe('AF')
  expect(initials('PriceOye')).toBe('P')
  expect(initials('J. (Junaid Jamshed)')).toBe('J(')
})
