import SearchBar from '../components/SearchBar'; // Corrected relative path

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
        
        {/* --- ADD YOUR COMPONENT HERE --- */}
        <SearchBar />

      </div>
    </div>
  );
}