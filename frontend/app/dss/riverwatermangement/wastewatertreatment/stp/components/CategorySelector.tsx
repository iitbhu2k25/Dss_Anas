"use client";

import { useState } from 'react';

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  weight: string;
}

const CategorySelector = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Category options with their icons, colors, and weights
  const categories: CategoryOption[] = [
    { id: 'cat1', label: 'Pollution Load Contribution', icon: 'water', iconColor: 'text-blue-600', weight: '20%' },
    { id: 'cat2', label: 'Proximity to Critical River Stretches', icon: 'temperature-high', iconColor: 'text-red-600', weight: '20%' },
    { id: 'cat3', label: 'Existing Infrastructure & Connectivity', icon: 'cloud-rain', iconColor: 'text-blue-400', weight: '15%' },
    { id: 'cat4', label: 'Population Density', icon: 'users', iconColor: 'text-green-600', weight: '15%' },
    { id: 'cat5', label: 'Drainage Network Contribution', icon: 'landmark', iconColor: 'text-yellow-500', weight: '15%' },
    { id: 'cat6', label: 'Land Availability', icon: 'chart-line', iconColor: 'text-blue-600', weight: '10%' },
    { id: 'cat7', label: 'GroundWater Vulnerability', icon: 'tint', iconColor: 'text-blue-400', weight: '5%' },
  ];

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="bg-blue-600 text-white p-3 rounded-t-lg w-auto">
        <h3 className="text-lg font-semibold">
        <i className="fas fa-map-marker-alt mr-2 h-[30px]"></i>Categories
        </h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-3 md:border-r md:pr-6">
            {categories.slice(0, 4).map((category) => (
              <div key={category.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryChange(category.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={category.id} className="ml-2 block text-sm text-gray-700">
                  <div className="flex items-center">
                    <i className={`fas fa-${category.icon} ${category.iconColor} mr-2`}></i>
                    <span>{category.label} <span className="text-gray-500">({category.weight})</span></span>
                  </div>
                </label>
              </div>
            ))}
          </div>
          
          {/* Right Column */}
          <div className="space-y-3">
            {categories.slice(4).map((category) => (
              <div key={category.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryChange(category.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={category.id} className="ml-2 block text-sm text-gray-700">
                  <div className="flex items-center">
                    <i className={`fas fa-${category.icon} ${category.iconColor} mr-2`}></i>
                    <span>{category.label} <span className="text-gray-500">({category.weight})</span></span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;