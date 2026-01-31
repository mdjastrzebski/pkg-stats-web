import { useState, useEffect, useCallback, useRef } from "react"
import { searchPackages, type PackageSearchResult } from "../services/npm-api"

interface UseAutocompleteOptions {
  debounceMs?: number
  minQueryLength?: number
  maxResults?: number
  onSelect?: (value: string) => void
}

export function useAutocomplete({
  debounceMs = 300,
  minQueryLength = 2,
  maxResults = 10,
  onSelect,
}: UseAutocompleteOptions = {}) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<PackageSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const debounceTimerRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      if (searchQuery.trim().length < minQueryLength) {
        setSuggestions([])
        setIsLoading(false)
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      setIsOpen(true)

      abortControllerRef.current = new AbortController()

      try {
        const results = await searchPackages(searchQuery, maxResults)
        if (!abortControllerRef.current.signal.aborted) {
          setSuggestions(results)
          setSelectedIndex(-1)
          setIsOpen(results.length > 0)
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name !== "AbortError" &&
          !abortControllerRef.current.signal.aborted
        ) {
          console.warn("Search error:", error)
          setSuggestions([])
          setIsOpen(false)
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [minQueryLength, maxResults],
  )

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      setSelectedIndex(-1)

      if (newQuery.trim().length < minQueryLength) {
        setSuggestions([])
        setIsOpen(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      debounceTimerRef.current = window.setTimeout(() => {
        performSearch(newQuery)
      }, debounceMs)
    },
    [debounceMs, minQueryLength, performSearch],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const selected = suggestions[selectedIndex].name
            setQuery(selected)
            setSuggestions([])
            setIsOpen(false)
            onSelect?.(selected)
          }
          break
        case "Escape":
          e.preventDefault()
          setSuggestions([])
          setIsOpen(false)
          setSelectedIndex(-1)
          break
      }
    },
    [isOpen, suggestions, selectedIndex, onSelect],
  )

  const selectSuggestion = useCallback(
    (suggestion: PackageSearchResult) => {
      setQuery(suggestion.name)
      setSuggestions([])
      setIsOpen(false)
      setSelectedIndex(-1)
      onSelect?.(suggestion.name)
    },
    [onSelect],
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    suggestions,
    isLoading,
    selectedIndex,
    isOpen,
    updateQuery,
    handleKeyDown,
    selectSuggestion,
    close,
  }
}
