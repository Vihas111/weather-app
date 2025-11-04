/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import Page from './page'; // Imports your main page component
import '@testing-library/jest-dom';

describe('Home Page', () => {
  it('renders the main element without crashing', () => {
    // 1. Render the component
    render(<Page />);

    // 2. Find an element
    // (This assumes your page.tsx has a <main> tag, which is standard)
    const mainElement = screen.getByRole('main');

    // 3. Assert that the element exists
    expect(mainElement).toBeInTheDocument();
  });
});