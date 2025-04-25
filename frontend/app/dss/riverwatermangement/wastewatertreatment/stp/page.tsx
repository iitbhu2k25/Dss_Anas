"use client";

import { useEffect, useState } from 'react';
import LocationSelector from './components/LocationSelector';
import CategorySelector from './components/CategorySelector';
import Map from './components/Map';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle form submission
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <main className="container mx-auto py-4 ml-15">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="mt-2">Loading data...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left panel - 2/3 width on medium screens and above */}
        <div className="md:w-2/3 space-y-4">
          {/* Location Selector Component */}
          <LocationSelector />

          {/* Category Selector Component */}
          <CategorySelector />

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold shadow-sm"
          >
            Submit
          </button>
        </div>

        {/* Right panel - 1/3 width on medium screens and above */}
        <div className="md:w-1/3 h-[600px]">
          <Map />
        </div>
      </div>
    </main>
  );
}
