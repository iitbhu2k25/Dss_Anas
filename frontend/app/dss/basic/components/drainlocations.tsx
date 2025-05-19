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
  id: number;
  stretchId: number;
  stretchName?: string;
}

interface IntersectedVillage {
  shapeID: string;
  shapeName: string;
  drainNo: number;
  selected?: boolean;
}

// New interface for village items in MultiSelect
interface VillageItem {
  shapeID: string;
  name: string;
  drainNo: number;
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
  onVillagesChange?: (villages: IntersectedVillage[]) => void; // Ensure this is present
  villages?: IntersectedVillage[];
}

const DrainLocationsSelector: React.FC<DrainLocationsSelectorProps> = ({
  onConfirm,
  onReset,
  onRiverChange,
  onStretchChange,
  onDrainsChange,
  onVillagesChange,
  villages = [], // Default to empty array
}) => {
  // Main state
  const [rivers, setRivers] = useState<LocationItem[]>([]);
  const [stretches, setStretches] = useState<Stretch[]>([]);
  const [drains, setDrains] = useState<Drain[]>([]);
  const [selectedRiver, setSelectedRiver] = useState<string>('');
  const [selectedStretch, setSelectedStretch] = useState<string>('');
  const [selectedDrains, setSelectedDrains] = useState<string[]>([]);
  const [selectionsLocked, setSelectionsLocked] = useState<boolean>(false);

  // State for intersected villages
  const [intersectedVillages, setIntersectedVillages] = useState<IntersectedVillage[]>([]);
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(false);
  const [villageError, setVillageError] = useState<string | null>(null);

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

          const sortedStretches = [...stretchData].sort((a, b) => {
            const aName = a.name || '';  // Default to empty string if name is undefined
            const bName = b.name || '';  // Default to empty string if name is undefined
            return aName.localeCompare(bName);
          });
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

  // Fetch intersected villages when drains are selected
  useEffect(() => {
    if (selectedDrains.length > 0) {
      const fetchIntersectedVillages = async (): Promise<void> => {
        try {
          setLoadingVillages(true);
          setVillageError(null);
          setError(null);

          const response = await fetch('http://localhost:9000/api/basic/catchment_village/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Drain_No: selectedDrains.map(id => parseInt(id))
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch intersected villages (Status: ${response.status})`);
          }

          const data = await response.json();
          // Add selected property to each village (default to selected=true)
          const villagesWithSelection = (data.intersected_villages || []).map(village => ({
            ...village,
            selected: true
          }));

          setIntersectedVillages(villagesWithSelection);

          // Initialize village selection with all villages selected
          const initialSelectedVillages = villagesWithSelection.map(village => village.shapeID);
          setSelectedVillages(initialSelectedVillages);

          console.log('Intersected villages with selection:', villagesWithSelection);
        } catch (error: any) {
          console.error('Error fetching intersected villages:', error);
          setVillageError(error.message);
          // Don't set the main error for this, as it's supplementary data
          setIntersectedVillages([]);
          setSelectedVillages([]);
        } finally {
          setLoadingVillages(false);
        }
      };

      fetchIntersectedVillages();
    } else {
      setIntersectedVillages([]);
      setSelectedVillages([]);
    }
  }, [selectedDrains]);

  // Update intersectedVillages when the villages prop changes
  useEffect(() => {
    if (villages && villages.length > 0) {
      console.log('Villages prop received in DrainLocationsSelector:', villages);
      setIntersectedVillages(villages);

      // Update selected villages based on prop
      const selectedFromProps = villages
        .filter(village => village.selected !== false)
        .map(village => village.shapeID);
      console.log('Updating selectedVillages:', selectedFromProps);
      setSelectedVillages(selectedFromProps);
    } else {
      // Clear states if no villages are provided
      setIntersectedVillages([]);
      setSelectedVillages([]);
    }
  }, [villages]);

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
      // Make sure these are properly formatted as strings
      const formattedDrainIds = newSelectedDrains.map(id => id.toString());
      setSelectedDrains(formattedDrainIds);

      if (onDrainsChange) {
        // Pass the correctly formatted IDs
        onDrainsChange(formattedDrainIds);
      }
    }
  };

  // New handler for village selection changes
  const handleVillagesChange = (newSelectedVillages: string[]) => {
    if (!selectionsLocked || selectionsLocked) { // Allow village changes even when locked
      console.log('Villages selection changed in dropdown:', newSelectedVillages);
      setSelectedVillages(newSelectedVillages);

      const updatedVillages = intersectedVillages.map(village => ({
        ...village,
        selected: newSelectedVillages.includes(village.shapeID)
      }));

      setIntersectedVillages(updatedVillages);

      if (onVillagesChange) {
        onVillagesChange(updatedVillages);
      }

      if (window.selectedRiverData) {
        window.selectedRiverData = {
          ...window.selectedRiverData,
          selectedVillages: updatedVillages.filter(v => v.selected !== false)
        };
      }
    }
  };
  const handleReset = (): void => {
    setSelectedRiver('');
    setSelectedStretch('');
    setSelectedDrains([]);
    setSelectedVillages([]);
    setSelectionsLocked(false);
    setError(null);
    setRiverError(null);
    setStretchError(null);
    setDrainError(null);
    setVillageError(null);
    setIntersectedVillages([]);

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

  const formatIntersectedVillages = (): string => {
    console.log('Formatting intersected villages:', intersectedVillages);
    const selectedVillageObjects = intersectedVillages.filter(v => v.selected !== false);
    console.log('Selected villages to display:', selectedVillageObjects);

    if (selectedVillageObjects.length === 0) return 'None';

    const groupedByDrain: { [key: string]: string[] } = {};
    selectedVillageObjects.forEach(v => {
      const drainKey = v.drainNo ? `Drain ${v.drainNo}` : 'Unknown Drain';
      if (!groupedByDrain[drainKey]) groupedByDrain[drainKey] = [];
      groupedByDrain[drainKey].push(v.shapeName);
    });

    const formatted = Object.entries(groupedByDrain)
      .map(([drain, villages]) => {
        const uniqueVillages = [...new Set(villages)];
        return `${drain}: ${uniqueVillages.join(', ')}`;
      })
      .join('; ');

    return formatted || 'None';
  };

  // Get the currently selected river object
  const selectedRiverObject = rivers.find(r => r.id.toString() === selectedRiver);

  // Get the currently selected stretch object
  const selectedStretchObject = stretches.find(s => s.id.toString() === selectedStretch);

  const handleConfirm = (): void => {
    if (selectedDrains.length > 0) {
      setSelectionsLocked(true);

      const selectedDrainObjects = drains.filter(drain =>
        selectedDrains.includes(drain.id.toString())
      );

      console.log('Selected drain objects:', selectedDrainObjects);
      console.log('Selected drain IDs:', selectedDrains);

      // Filter to only include selected villages
      const selectedVillageObjects = intersectedVillages.filter(v => v.selected !== false);
      console.log('Selected villages for confirmation:', selectedVillageObjects);

      const riverData = {
        river: selectedRiverObject?.name || '',
        stretch: selectedStretchObject?.name || '',
        drains: selectedDrainObjects.map(d => d.name),
        allDrains: selectedDrainObjects.map(d => ({
          name: d.name,
          id: d.id.toString(), // Make sure IDs are strings
          stretch: d.stretchName,
        })),
        selectedVillages: selectedVillageObjects
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
    // Ensure IDs are correctly captured and formatted
    return `${drain.name} (ID: ${drain.id})`;
  };

  const formatVillageDisplay = (village: VillageItem): string => {
    return `${village.name} (Drain ${village.drainNo})`;
  };

  const groupDrainsByStretch = (drains: Drain[]): { [key: string]: Drain[] } => {
    return drains.reduce((groups: { [key: string]: Drain[] }, item) => {
      const stretchName = item.stretchName || 'Unknown';
      if (!groups[stretchName]) groups[stretchName] = [];
      groups[stretchName].push(item);
      return groups;
    }, {});
  };

  const groupVillagesByDrain = (villages: VillageItem[]): { [key: string]: VillageItem[] } => {
    return villages.reduce((groups: { [key: string]: VillageItem[] }, item) => {
      const drainKey = `Drain ${item.drainNo}`;
      if (!groups[drainKey]) groups[drainKey] = [];
      groups[drainKey].push(item);
      return groups;
    }, {});
  };

  // Convert intersected villages to format expected by MultiSelect
  const villageItems: VillageItem[] = intersectedVillages.map(village => ({
    id: village.shapeID,
    name: village.shapeName,
    drainNo: village.drainNo
  }));

  return (
    <div className="p-4 border-2 bg-gray-100 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-300">
          <div className="font-semibold mb-1">Error</div>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
          <MultiSelect
            items={drains}
            selectedItems={selectedDrains}
            onSelectionChange={selectionsLocked ? () => { } : handleDrainsChange}
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

        {/* Villages MultiSelect */}
        <div>
          <MultiSelect
            items={villageItems}
            selectedItems={selectedVillages}
            onSelectionChange={handleVillagesChange} // Always use handleVillagesChange
            label="Cachment Villages"
            placeholder="--Select Villages--"
            disabled={!selectedDrains.length || loadingVillages} // Remove selectionsLocked
            displayPattern={formatVillageDisplay}
            groupBy={groupVillagesByDrain}
            showGroupHeaders={true}
            groupHeaderFormat="Villages in {groupName}"
          />
          {villageError && <p className="mt-1 text-xs text-red-500">{villageError}</p>}
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
            {stretches.find(s => s.id.toString() === selectedStretch)?.id || 'None'}
          </p>
          <p>
            <span className="font-medium">Drains:</span>{' '}
            <TruncatedList content={formatSelectedDrains(drains, selectedDrains)} maxLength={80} />
          </p>

          {/* Display intersected villages */}
          <p>
            <span className="font-medium">Cachement Villages:</span>{' '}
            {loadingVillages ? (
              <span className="italic text-gray-500">Loading villages...</span>
            ) : (
              <TruncatedList content={formatIntersectedVillages()} maxLength={80} />
            )}
          </p>

          {villageError && <p className="text-xs text-red-500 mt-1">{villageError}</p>}

          {intersectedVillages.length > 0 && !loadingVillages && (
            <div className="mt-2 text-xs text-blue-600">
              <p>Click on village polygons in the map to toggle selection</p>
              <p className="mt-1">Selected: {selectedVillages.length} of {intersectedVillages.length} villages</p>
            </div>
          )}

          {selectionsLocked && (
            <p className="mt-2 text-green-600 font-medium">Selections confirmed and locked</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mt-4">
        <button
          className={`${selectedDrains.length > 0 && !selectionsLocked
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