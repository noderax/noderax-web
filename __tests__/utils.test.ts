import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('cn utility', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
  })

  it('handles conditional classes properly', () => {
    const isActive = true
    expect(cn('btn', isActive && 'btn-active')).toBe('btn btn-active')
  })

  it('overrides conflicting tailwind classes using tailwind-merge', () => {
    expect(cn('px-2 py-1 bg-red-500', 'p-4 bg-blue-500')).toBe('p-4 bg-blue-500')
  })
})
