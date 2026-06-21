import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CellButton } from './CellButton';
import type { Cell } from '../../domain/models';

const baseCell: Cell = {
  id: 'c1',
  label: 'שלום',
  fitzgerald: 'noun',
  isCore: false,
  action: { type: 'speak' },
};

describe('CellButton — image rendering (M11)', () => {
  it('תא ללא imageUri — לא מרנדר img', () => {
    const { container } = render(<CellButton cell={baseCell} onActivate={vi.fn()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('שלום')).toBeInTheDocument();
  });

  it('תא עם imageUri — מרנדר img עם src נכון', () => {
    const cell: Cell = { ...baseCell, imageUri: 'https://example.com/img.png' };
    const { container } = render(<CellButton cell={cell} onActivate={vi.fn()} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
    expect(screen.getByText('שלום')).toBeInTheDocument();
  });

  it('onError מסתיר img; label נשאר גלוי', () => {
    const cell: Cell = { ...baseCell, imageUri: 'https://example.com/broken.png' };
    const { container } = render(<CellButton cell={cell} onActivate={vi.fn()} />);
    const img = container.querySelector('img')!;
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('שלום')).toBeInTheDocument();
  });
});
