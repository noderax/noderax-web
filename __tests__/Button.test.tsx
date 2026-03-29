import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import React from 'react'

describe('Button component', () => {
  it('renders correctly with given text', () => {
    render(<Button>Click Me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })
})
