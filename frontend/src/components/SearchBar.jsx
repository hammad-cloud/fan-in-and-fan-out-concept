export default function SearchBar({ value, onChange, onSearch, loading, compact = false }) {
  return (
    <form
      className={`search ${compact ? 'search-compact' : ''}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(value)
      }}
    >
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a product, e.g. deodorant, iPhone, lawn suit"
        aria-label="Search products"
        minLength={2}
        maxLength={100}
      />
      <button type="submit" disabled={loading || value.trim().length < 2}>
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
