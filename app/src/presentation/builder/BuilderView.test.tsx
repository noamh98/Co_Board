import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BuilderView } from './BuilderView';
import type { Board } from '../../domain/models';

const boardWithImage: Board = {
  id: 'b1',
  name: 'לוח בדיקה',
  grid: { rows: 1, cols: 1 },
  cells: {
    c1: {
      id: 'c1',
      label: 'כלב',
      fitzgerald: 'noun',
      isCore: false,
      imageUri: 'https://example.com/dog.png',
      action: { type: 'speak' },
    },
  },
  placements: [{ cellId: 'c1', row: 0, col: 0 }],
};

describe('BuilderView — image rendering (M11)', () => {
  it('builder: תא עם imageUri מציג img', () => {
    const { container } = render(
      <BuilderView
        board={boardWithImage}
        onBoardChange={vi.fn()}
        onExitBuilder={vi.fn()}
        nikudService={null}
      />,
    );
    const img = container.querySelector('img[src="https://example.com/dog.png"]');
    expect(img).not.toBeNull();
  });
});
