import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PriceSummary from './PriceSummary'
import ProductCard from './ProductCard'
import SearchBar from './SearchBar'

const offer = (store, price, extra = {}) => ({
  store,
  storeName: store.toUpperCase(),
  title: `${store} earbuds`,
  price,
  url: `https://${store}.test/p`,
  ...extra,
})

describe('SearchBar', () => {
  test('search button is disabled until 2 characters are typed', () => {
    const { rerender } = render(<SearchBar value="a" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Search' }).disabled).toBe(true)
    rerender(<SearchBar value="ab" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Search' }).disabled).toBe(false)
  })

  test('typing calls onChange and submitting calls onSearch', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()
    render(<SearchBar value="earbuds" onChange={onChange} onSearch={onSearch} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'shoes' } })
    expect(onChange).toHaveBeenCalledWith('shoes')
    fireEvent.submit(screen.getByRole('search'))
    expect(onSearch).toHaveBeenCalledWith('earbuds')
  })

  test('shows a busy, disabled button while loading', () => {
    render(<SearchBar value="earbuds" onChange={() => {}} onSearch={() => {}} loading />)
    expect(screen.getByRole('button', { name: 'Searching…' }).disabled).toBe(true)
  })
})

describe('ProductCard', () => {
  test('marks the lowest in-stock offer and shows the discount', () => {
    render(<ProductCard offer={offer('daraz', 750, { originalPrice: 1000, available: true })} lowest={750} />)
    screen.getByText('Lowest price')
    screen.getByText('25% off')
    expect(screen.getByText('Rs. 1,000').tagName).toBe('S')
    screen.getByText('In stock')
  })

  test('shows how much more a pricier offer costs', () => {
    render(<ProductCard offer={offer('highfy', 1200)} lowest={750} />)
    screen.getByText('Rs. 450 more than the lowest')
    expect(screen.queryByText('Lowest price')).toBeNull()
  })

  test('a cheaper out-of-stock offer is never called the lowest', () => {
    render(<ProductCard offer={offer('naheed', 500, { available: false })} lowest={750} />)
    screen.getByText('Cheaper, but out of stock')
    screen.getByText('Out of stock')
  })

  test('opens the store in a new tab without leaking the referrer', () => {
    render(<ProductCard offer={offer('daraz', 750)} lowest={750} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('https://daraz.test/p')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
  })
})

describe('PriceSummary', () => {
  const offers = Array.from({ length: 8 }, (_, i) => offer(`s${i}`, 100 * (i + 1)))

  test('shows the difference from the lowest price per store', () => {
    render(<PriceSummary offers={offers} />)
    screen.getByText('Lowest')
    screen.getByText('+Rs. 100') // 200 vs 100
    screen.getByText('(100%)')
  })

  test('collapses to 6 stores and expands on demand', () => {
    render(<PriceSummary offers={offers} />)
    expect(screen.getAllByRole('row')).toHaveLength(1 + 6) // header + rows
    fireEvent.click(screen.getByRole('button', { name: 'Show all 8 stores' }))
    expect(screen.getAllByRole('row')).toHaveLength(1 + 8)
    screen.getByRole('button', { name: 'Show fewer stores' })
  })
})
