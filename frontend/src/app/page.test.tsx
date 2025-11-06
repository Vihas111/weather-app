/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import Page from './page'; // Imports your main page component
import '@testing-library/jest-dom';

describe('Home Page', () => {
  it('renders the main heading and search bar', () => {
    // 1. Render the component
    render(<Page />);

    // --- THIS IS THE FIX ---
    // 2. Find an element that we know is on the new page
    const headingElement = screen.getByRole('heading', {
      name: /san francisco/i,
    });

    // 3. Assert that the heading exists
    expect(headingElement).toBeInTheDocument();

    // 4. Also check that our SearchBar was rendered
    expect(screen.getByPlaceholderText('Enter city name (e.g., london)')).toBeInTheDocument();
  });
});