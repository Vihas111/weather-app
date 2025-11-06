import SearchBar from '@/components/SearchBar'; // Or your correct relative path

export default function Page() {
  return (
    // This is your teammate's layout (keep it!)
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">San Francisco</h1>
        <p className="text-lg text-gray-600">Weather information and forecasts</p>
      </header>
      
      {/* This is the main content area */}
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
        
        {/* --- DELETE THE PLACEHOLDER --- */}
        {/* <svg>...</svg> */}
        {/* <p>Weather App Coming Soon!</p> */}

        {/* --- ADD YOUR COMPONENT --- */}
        <SearchBar />

      </div>
    </div>
  );
}