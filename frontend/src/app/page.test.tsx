/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import Page from './page';
import '@testing-library/jest-dom';

describe('Home Page', () => {
  it('renders the main element without crashing', () => {
    render(<Page />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
