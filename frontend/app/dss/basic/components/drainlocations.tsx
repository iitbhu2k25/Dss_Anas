'use client'
import React, { useState, useEffect } from 'react';
import { MultiSelect } from './Multiselect';

// Define global interface for window
declare global {
  interface Window {
    resetStretchSelectionsInDrainLocationsSelector?: () => void;
    resetDrainSelectionsInDrainLocationsSelector?: () => void;
    selectedRiverData?: any;
  }
}

// Interfaces for API responses
interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    id?: string;
    type: 'Feature';
    properties: Record<string, any>;
    geometry: any;
  }>;
}

interface LocationItem {
  id: number;
  name: string;
}

interface Stretch extends LocationItem {
  riverId: number;
}

interface Drain extends LocationItem {
  stretchId: number;
  stretchName?: string;
}

interface TruncatedListProps {
  content: string;
  maxLength?: number;
}

const TruncatedList: React.FC<TruncatedListProps> = ({ content, maxLength = 100 }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  if (!content || content === 'None') return <span>None</span>;
  if (content.length <= maxLength) return <span>{content}</span>;
  
  return (
    <span>
      {expanded ? (
        <>
          {content}
          <button
            onClick={() => setExpanded(false)}
            className="ml-2 text-blue-500 hover:text-blue-700 text-xs font-medium"
          >
            Show less
          </button>
        </>
      ) : (
        <>
          {content.substring(0, maxLength)}...
          <button
            onClick={() => setExpanded(true)}
            className="ml-2 text-blue-500 hover:text-blue-700 text-xs font-medium"
          >
            Show more
          </button>
        </>
      )}
    </span>
  );
};

interface DrainLocationsSelectorProps {
  onConfirm?: (selectedData: { drains: Drain[] }) => void;
  onReset?: () => void;
  onRiverChange?: (riverId: string) => void;
  onStretchChange?: (stretchId: string) => void;
  onDrainsChange?: (drains: string[]) => void;
}

const DrainLocationsSelector: React.FC<DrainLocationsSelectorProps> = ({
  onConfirm,
  onReset,
  onRiverChange,
  onStretchChange,
  onDrainsChange,
}) => {
  // Main state
  const [rivers, setRivers] = useState<LocationItem[]>([]);
  const [stretches, setStretches] = useState<Stretch[]>([]);
  const [drains, setDrains] = useState<Drain[]>([]);
  const [selectedRiver, setSelectedRiver] = useState<string>('');
  const [selectedStretch, setSelectedStretch] = useState<string>('');
  const [selectedDrains, setSelectedDrains] = useState<string[]>([]);
  const [selectionsLocked, setSelectionsLocked] = useState<boolean>(false);
  
  // Loading states
  const [loadingRivers, setLoadingRivers] = useState<boolean>(false);
  const [loadingStretches, setLoadingStretches] = useState<boolean>(false);
  const [loadingDrains, setLoadingDrains] = useState<boolean>(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [riverError, setRiverError] = useState<string | null>(null);
  const [stretchError, setStretchError] = useState<string | null>(null);
  const [drainError, setDrainError] = useState<string | null>(null);

  // Register reset functions to window
  useEffect(() => {
    window.resetStretchSelectionsInDrainLocationsSelector = () => {
      if (!selectionsLocked) {
        console.log('DrainLocationsSelector resetting stretch selections');
        setSelectedStretch('');
        setSelectedDrains([]);
      }
    };
    
    window.resetDrainSelectionsInDrainLocationsSelector = () => {
      if (!selectionsLocked) {
        console.log('DrainLocationsSelector resetting drain selections');
        setSelectedDrains([]);
      }
    };
    
    return () => {
      window.resetStretchSelectionsInDrainLocationsSelector = undefined;
      window.resetDrainSelectionsInDrainLocationsSelector = undefined;
    };
  }, [selectionsLocked]);

  // Fetch rivers
  useEffect(() => {
    const fetchRivers = async (): Promise<void> => {
      try {
        setLoadingRivers(true);
        setRiverError(null);
        setError(null);
        
        const response = await fetch('http://localhost:9000/api/basic/rivers/');
        if (!response.ok) {
          throw new Error(`Failed to fetch rivers (Status: ${response.status})`);
        }
        
        const data: GeoJSONFeatureCollection = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          throw new Error('Invalid river data format received');
        }
        
        const riverData: LocationItem[] = data.features.map(feature => ({
          id: feature.properties.River_Code,
          name: feature.properties.River_Name,
        }));
        
        setRivers(riverData);
      } catch (error: any) {
        console.error('Error fetching rivers:', error);
        setRiverError(error.message);
        setError('Unable to load rivers. Please try refreshing the page.');
        setRivers([]);
      } finally {
        setLoadingRivers(false);
      }
    };
    
    fetchRivers();
  }, []);

  // Fetch stretches when river is selected
  useEffect(() => {
    if (selectedRiver) {
      const fetchStretches = async (): Promise<void> => {
        try {
          setLoadingStretches(true);
          setStretchError(null);
          setError(null);
          
          const response = await fetch('http://localhost:9000/api/basic/river-stretched/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ River_Code: parseInt(selectedRiver) }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch stretches (Status: ${response.status})`);
          }
          
          const data: GeoJSONFeatureCollection = await response.json();
          
          if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
            throw new Error('Invalid stretch data format received');
          }
          
          const stretchData: Stretch[] = data.features.map(feature => ({
            id: feature.properties.Stretch_ID,
            name: feature.properties.River_Name,
            riverId: parseInt(selectedRiver),
          }));
          
          const sortedStretches = [...stretchData].sort((a, b) => a.name.localeCompare(b.name));
          setStretches(sortedStretches);
          setSelectedStretch('');
        } catch (error: any) {
          console.error('Error fetching stretches:', error);
          setStretchError(error.message);
          setError('Unable to load stretches for the selected river.');
          setStretches([]);
        } finally {
          setLoadingStretches(false);
        }
      };
      
      fetchStretches();
    } else {
      setStretches([]);
      setSelectedStretch('');
      setDrains([]);
      setSelectedDrains([]);
    }
  }, [selectedRiver]);

  // Fetch drains when stretch is selected
  useEffect(() => {
    if (selectedStretch) {
      const fetchDrains = async (): Promise<void> => {
        try {
          setLoadingDrains(true);
          setDrainError(null);
          setError(null);
          
          const response = await fetch('http://localhost:9000/api/basic/drain/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Stretch_ID: parseInt(selectedStretch) }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch drains (Status: ${response.status})`);
          }
          
          const data: GeoJSONFeatureCollection = await response.json();
          
          if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
            throw new Error('Invalid drain data format received');
          }
          
          // Corrected property name: Drain_No instead of Drain_NO
          const stretchMap = new Map(stretches.map(stretch => [stretch.id.toString(), stretch.name]));
          const drainData: Drain[] = data.features.map(feature => ({
            id: feature.properties.Drain_No, // Fix: property name matches API
            name: `Drain ${feature.properties.Drain_No}`,
            stretchId: feature.properties.Stretch_ID,
            stretchName: stretchMap.get(feature.properties.Stretch_ID.toString()) || 'Unknown Stretch',
          }));
          
          const sortedDrains = [...drainData].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
          setDrains(sortedDrains);
          setSelectedDrains([]);
        } catch (error: any) {
          console.error('Error fetching drains:', error);
          setDrainError(error.message);
          setError('Unable to load drains for the selected stretch.');
          setDrains([]);
        } finally {
          setLoadingDrains(false);
        }
      };
      
      fetchDrains();
    } else {
      setDrains([]);
      setSelectedDrains([]);
    }
  }, [selectedStretch, stretches]);

  // Event handlers
  const handleRiverChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    if (!selectionsLocked) {
      const riverId = e.target.value;
      setSelectedRiver(riverId);
      
      if (onRiverChange) {
        onRiverChange(riverId);
      }
    }
  };

  const handleStretchChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    if (!selectionsLocked) {
      const stretchId = e.target.value;
      setSelectedStretch(stretchId);
      
      if (onStretchChange) {
        onStretchChange(stretchId);
      }
    }
  };

  const handleDrainsChange = (newSelectedDrains: string[]) => {
    if (!selectionsLocked) {
      setSelectedDrains(newSelectedDrains);
      
      if (onDrainsChange) {
        onDrainsChange(newSelectedDrains);
      }
    }
  };

  const handleReset = (): void => {
    setSelectedRiver('');
    setSelectedStretch('');
    setSelectedDrains([]);
    setSelectionsLocked(false);
    setError(null);
    setRiverError(null);
    setStretchError(null);
    setDrainError(null);
    
    if (onReset) {
      onReset();
    }
  };

  const formatSelectedDrains = (items: Drain[], selectedIds: string[]): string => {
    if (selectedIds.length === 0) return 'None';
    if (selectedIds.length === items.length) return 'All Drains';
    
    const selectedItems = items.filter(item => selectedIds.includes(item.id.toString()));
    if (selectedItems.length === 0) return 'None';
    
    const groupedByStretch: { [key: string]: Drain[] } = {};
    selectedItems.forEach(item => {
      const stretchName = item.stretchName || 'Unknown';
      if (!groupedByStretch[stretchName]) groupedByStretch[stretchName] = [];
      groupedByStretch[stretchName].push(item);
    });
    
    const stretchDrainCount = drains.reduce((acc: { [key: string]: number }, drain) => {
      const stretchName = drain.stretchName || 'Unknown';
      acc[stretchName] = (acc[stretchName] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(groupedByStretch)
      .map(([stretch, drains]) => {
        if (drains.length === (stretchDrainCount[stretch] || 0)) {
          return `All Drains of ${stretch}`;
        }
        return `${stretch}: ${drains.map(d => d.name).join(', ')}`;
      })
      .join('; ');
  };

  const handleConfirm = (): void => {
    if (selectedDrains.length > 0) {
      setSelectionsLocked(true);
      
      const selectedDrainObjects = drains.filter(drain =>
        selectedDrains.includes(drain.id.toString())
      );
      
      const selectedStretchObject = stretches.find(stretch =>
        stretch.id.toString() === selectedStretch
      );
      
      const selectedRiverObject = rivers.find(river =>
        river.id.toString() === selectedRiver
      );
      
      const riverData = {
        river: selectedRiverObject?.name || '',
        stretch: selectedStretchObject?.name || '',
        drains: selectedDrainObjects.map(d => d.name),
        allDrains: selectedDrainObjects.map(d => ({
          name: d.name,
          stretch: d.stretchName,
        })),
      };
      
      window.selectedRiverData = riverData;
      console.log('River data stored in window object:', riverData);
      
      if (onConfirm) {
        onConfirm({
          drains: selectedDrainObjects,
        });
      }
    }
  };

  const formatDrainDisplay = (drain: Drain): string => {
    return drain.name;
  };

  const groupDrainsByStretch = (drains: Drain[]): { [key: string]: Drain[] } => {
    return drains.reduce((groups: { [key: string]: Drain[] }, item) => {
      const stretchName = item.stretchName || 'Unknown';
      if (!groups[stretchName]) groups[stretchName] = [];
      groups[stretchName].push(item);
      return groups;
    }, {});
  };

  return (
    <div className="p-4 border-2 bg-gray-100 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-300">
          <div className="font-semibold mb-1">Error</div>
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* River Dropdown */}
        <div>
          <label htmlFor="river-dropdown" className="block text-sm font-semibold text-gray-700 mb-2">
            River:
          </label>
          <div className="relative">
            <select
              id="river-dropdown"
              className={`w-full p-2 text-sm border ${riverError ? 'border-red-500' : 'border-blue-500'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${loadingRivers ? 'bg-gray-100' : ''}`}
              value={selectedRiver}
              onChange={handleRiverChange}
              disabled={selectionsLocked || loadingRivers}
            >
              <option value="">--Choose a River--</option>
              {rivers.map(river => (
                <option key={river.id} value={river.id}>
                  {river.name}
                </option>
              ))}
            </select>
            {loadingRivers && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div className="w-4 h-4 border-2 border-t-blue-500 border-r-blue-500 border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {riverError && <p className="mt-1 text-xs text-red-500">{riverError}</p>}
        </div>
        
        {/* Stretch Dropdown */}
        <div>
          <label htmlFor="stretch-dropdown" className="block text-sm font-semibold text-gray-700 mb-2">
            Stretch:
          </label>
          <div className="relative">
            <select
              id="stretch-dropdown"
              className={`w-full p-2 text-sm border ${stretchError ? 'border-red-500' : 'border-blue-500'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${loadingStretches ? 'bg-gray-100' : ''}`}
              value={selectedStretch}
              onChange={handleStretchChange}
              disabled={!selectedRiver || selectionsLocked || loadingStretches}
            >
              <option value="">--Choose a Stretch--</option>
              {stretches.map(stretch => (
                <option key={stretch.id} value={stretch.id}>
                  {stretch.id}
                </option>
              ))}
            </select>
            {loadingStretches && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div className="w-4 h-4 border-2 border-t-blue-500 border-r-blue-500 border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {stretchError && <p className="mt-1 text-xs text-red-500">{stretchError}</p>}
        </div>
        
        {/* Drain MultiSelect */}
        <div>
          <label htmlFor="drain-multiselect" className="block text-sm font-semibold text-gray-700 mb-2">
            Drain {loadingDrains && <span className="text-gray-500 text-xs">(Loading...)</span>}
          </label>
          <MultiSelect
            items={drains}
            selectedItems={selectedDrains}
            onSelectionChange={selectionsLocked ? () => {} : handleDrainsChange}
            label="Drain"
            placeholder="--Choose Drains--"
            disabled={!selectedStretch || selectionsLocked || loadingDrains}
            displayPattern={formatDrainDisplay}
            groupBy={groupDrainsByStretch}
            showGroupHeaders={true}
            groupHeaderFormat="Stretch: {groupName}"
          />
          {drainError && <p className="mt-1 text-xs text-red-500">{drainError}</p>}
        </div>
      </div>
      
      {/* Selected Data Summary */}
      <div className="mt-6 p-4 px-5 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-md font-medium text-gray-800 mb-2">Selected River Data</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">River:</span>{' '}
            {rivers.find(r => r.id.toString() === selectedRiver)?.name || 'None'}
          </p>
          <p>
            <span className="font-medium">Stretch:</span>{' '}
            {stretches.find(s => s.id.toString() === selectedStretch)?.name || 'None'}
          </p>
          <p>
            <span className="font-medium">Drains:</span>{' '}
            <TruncatedList content={formatSelectedDrains(drains, selectedDrains)} maxLength={80} />
          </p>
          {selectionsLocked && (
            <p className="mt-2 text-green-600 font-medium">Selections confirmed and locked</p>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-4 mt-4">
        <button
          className={`${
            selectedDrains.length > 0 && !selectionsLocked
              ? 'bg-blue-500 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          } text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200`}
          onClick={handleConfirm}
          disabled={selectedDrains.length === 0 || selectionsLocked}
        >
          Confirm
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-200"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default DrainLocationsSelector;