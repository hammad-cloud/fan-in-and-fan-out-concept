import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

const STORES = [
  { id: 'daraz', name: 'Daraz', site: 'https://daraz.pk', category: 'Electronics' },
  { id: 'highfy', name: 'Highfy', site: 'https://highfy.pk', category: 'Beauty & Pharmacy' },
]
const RESULTS = {
  query: 'earbuds',
  totalMs: 1200,
  sources: [
    { id: 'daraz', name: 'Daraz', ok: true, count: 2, ms: 900 },
    { id: 'highfy', name: 'Highfy', ok: true, count: 1, ms: 400 },
    { id: 'laam', name: 'Laam', ok: false, count: 0, error: 'timed out' },
  ],
  results: [
    { store: 'daraz', storeName: 'Daraz', title: 'Cheap Earbuds', price: 500, url: 'https://daraz.pk/1', available: false },
    { store: 'highfy', storeName: 'Highfy', title: 'Mid Earbuds', price: 900, originalPrice: 1800, url: 'https://highfy.pk/1' },
    { store: 'daraz', storeName: 'Daraz', title: 'Pricey Earbuds', price: 2000, url: 'https://daraz.pk/2' },
  ],
}

// Answer /api/stores and /api/search like the backend; `search` overrides the search response.
function mockApi(search = { status: 200, body: RESULTS }) {
  globalThis.fetch = vi.fn(async (url) => {
    const { status, body } = url === '/api/stores' ? { status: 200, body: STORES } : search
    return { ok: status < 400, status, json: async () => body }
  })
}

const cardTitles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

async function searchFor(term) {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: term } })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await screen.findByText(/offers for/)
}

beforeEach(() => {
  window.scrollTo = vi.fn() // not implemented in jsdom
  localStorage.clear()
})

test('searching shows results cheapest first, with failed stores reported', async () => {
  mockApi()
  render(<App />)
  await searchFor('  earbuds  ')
  expect(fetch).toHaveBeenCalledWith('/api/search?q=earbuds')
  screen.getByText('3 offers for “earbuds”')
  screen.getByText(/2 of 3 stores had matches · 1\.2s · 1 unavailable/)
  screen.getByText('unavailable (timed out)')
  expect(cardTitles()).toEqual(['Cheap Earbuds', 'Mid Earbuds', 'Pricey Earbuds'])
})

test('the out-of-stock offer is not marked lowest; the cheapest buyable one is', async () => {
  mockApi()
  render(<App />)
  await searchFor('earbuds')
  screen.getByText('Cheaper, but out of stock')
  expect(screen.getByText('Lowest price').closest('a').getAttribute('href')).toBe('https://highfy.pk/1')
})

test('sort, stock filter and store filter change the visible offers', async () => {
  mockApi()
  render(<App />)
  await searchFor('earbuds')

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'price-desc' } })
  expect(cardTitles()).toEqual(['Pricey Earbuds', 'Mid Earbuds', 'Cheap Earbuds'])

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'discount' } })
  expect(cardTitles()[0]).toBe('Mid Earbuds')

  fireEvent.click(screen.getByRole('checkbox', { name: 'Hide out of stock' }))
  expect(cardTitles()).not.toContain('Cheap Earbuds')

  fireEvent.click(screen.getByRole('checkbox', { name: /Highfy/ }))
  expect(cardTitles()).toEqual(['Pricey Earbuds'])
})

test('an API error is shown to the user', async () => {
  mockApi({ status: 429, body: { error: 'Too many searches. Please wait a minute and try again.' } })
  render(<App />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'earbuds' } })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Too many searches. Please wait a minute and try again.')
})

test('an unreachable backend shows a helpful message', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  render(<App />)
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Backend is not reachable/))
})

test('a search with no matches says so', async () => {
  mockApi({ status: 200, body: { query: 'zzz', totalMs: 10, sources: [], results: [] } })
  render(<App />)
  await searchFor('zzz')
  screen.getByText('No stores had “zzz”. Try a simpler term.')
})
