import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Metric } from './Metric'

describe('Metric', () => {
  it('renders with basic value', () => {
    render(<Metric label="Portfolio Value" value="$100,000" />)

    expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
    expect(screen.getByText('$100,000')).toBeInTheDocument()
  })

  it('renders with suffix in value', () => {
    render(<Metric label="Positions" value="3/5" />)

    expect(screen.getByText('Positions')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('shows success color', () => {
    render(<Metric label="P&L" value="+$2.5%" color="success" />)

    const valueElement = screen.getByText('+$2.5%')
    expect(valueElement).toHaveClass('text-hud-success')
  })

  it('shows error color', () => {
    render(<Metric label="P&L" value="-$2.5%" color="error" />)

    const valueElement = screen.getByText('-$2.5%')
    expect(valueElement).toHaveClass('text-hud-error')
  })

  it('shows warning color', () => {
    render(<Metric label="Pending" value="3 items" color="warning" />)

    const valueElement = screen.getByText('3 items')
    expect(valueElement).toHaveClass('text-hud-warning')
  })

  it('renders numeric values', () => {
    render(<Metric label="Count" value={42} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Metric label="Test" value="sm" size="sm" />)
    expect(screen.getByText('sm')).toBeInTheDocument()

    rerender(<Metric label="Test" value="md" size="md" />)
    expect(screen.getByText('md')).toBeInTheDocument()

    rerender(<Metric label="Test" value="lg" size="lg" />)
    expect(screen.getByText('lg')).toBeInTheDocument()

    rerender(<Metric label="Test" value="xl" size="xl" />)
    expect(screen.getByText('xl')).toBeInTheDocument()
  })
})
