import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock the fetch function globally so we don't actually hit the API during tests
global.fetch = jest.fn();

describe('Home Page', () => {
  it('renders the main heading and search bar', () => {
    render(<Home />);

    // 1. Check for the new heading name
    const heading = screen.getByRole('heading', {
      name: /nimbus weather/i,
    });
    expect(heading).toBeInTheDocument();

    // 2. Check for the search input by its placeholder text
    const searchInput = screen.getByPlaceholderText(/enter city name/i);
    expect(searchInput).toBeInTheDocument();

    // 3. Check for the search button
    const searchButton = screen.getByRole('button', {
      name: /search/i,
    });
    expect(searchButton).toBeInTheDocument();
  });
});