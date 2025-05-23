'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import isEqual from 'lodash/isEqual';

type DomesticLoadMethod = 'manual' | 'modeled' | '';
type PeakFlowSewageSource = 'population_based' | 'drain_based' | 'water_based' | '';

export interface PollutionItem {
  name: string;
  perCapita: number;
  designCharacteristic?: number;
}

export interface DrainItem {
  id: string;
  name: string;
  discharge: number | '';
}


interface SelectedRiverData {
  drains: {
    id: string; // Change from number to string
    name: string;
    stretchId: number;
    flowRate: number;
  }[];
  totalFlowRate: number;
  allDrains?: { 
    id: string; // This should be Drain_No as string
    name: string; 
    stretch: string;
    drainNo?: string;
  }[];
}
// Add props interface for SewageCalculationForm
interface SewageCalculationFormProps {
  villages_props?: any[];
  totalPopulation_props?: number;
  sourceMode?: 'admin' | 'drain';
  selectedRiverData?: SelectedRiverData | null; // Add this
}

const defaultPollutionItems: PollutionItem[] = [
  { name: "BOD", perCapita: 27.0 },
  { name: "COD", perCapita: 45.9 },
  { name: "TSS", perCapita: 40.5 },
  { name: "VSS", perCapita: 28.4 },
  { name: "Total Nitrogen", perCapita: 5.4 },
  { name: "Organic Nitrogen", perCapita: 1.4 },
  { name: "Ammonia Nitrogen", perCapita: 3.5 },
  { name: "Nitrate Nitrogen", perCapita: 0.5 },
  { name: "Total Phosphorus", perCapita: 0.8 },
  { name: "Ortho Phosphorous", perCapita: 0.5 },
];

const SewageCalculationForm: React.FC<SewageCalculationFormProps> = ({
  sourceMode = 'admin',
  selectedRiverData
}) => {
  // --- States for Water Supply Method ---
  const [totalSupplyInput, setTotalSupplyInput] = useState<number | ''>('');
  const [waterSupplyResult, setWaterSupplyResult] = useState<any>(null);

  // --- States for Domestic Sewage Method ---
  const [domesticLoadMethod, setDomesticLoadMethod] = useState<DomesticLoadMethod>('');
  const [domesticSupplyInput, setDomesticSupplyInput] = useState<number | ''>('');
  const [unmeteredSupplyInput, setUnmeteredSupplyInput] = useState<number | ''>(0);
  const [domesticSewageResult, setDomesticSewageResult] = useState<any>(null);

  // --- Common States ---
  const [error, setError] = useState<string | null>(null);
  const [showPeakFlow, setShowPeakFlow] = useState(false);
  const [showRawSewage, setShowRawSewage] = useState(false);
  const [peakFlowSewageSource, setPeakFlowSewageSource] = useState<PeakFlowSewageSource>('population_based');
  const [drainCount, setDrainCount] = useState<number | ''>(1);
  const [drainItems, setDrainItems] = useState<DrainItem[]>([]);
  const [totalDrainDischarge, setTotalDrainDischarge] = useState<number>(0);
  const [previousTotalWaterSupply, setpreviousTotalWaterSupply] = useState<number>(0);

  const [checkboxes, setCheckboxes] = useState({
    populationForecasting: false,
    waterDemand: false,
    waterSupply: false,
    sewageCalculation: false,
    rawSewageCharacteristics: false,
  });

  const computedPopulation: { [year: string]: number } = (window as any).selectedPopulationForecast || {};
  const [pollutionItemsState, setPollutionItemsState] = useState<PollutionItem[]>(defaultPollutionItems);
  const [rawSewageTable, setRawSewageTable] = useState<JSX.Element | null>(null);
  const [peakFlowTable, setPeakFlowTable] = useState<JSX.Element | null>(null);
  const [peakFlowMethods, setPeakFlowMethods] = useState({
    cpheeo: false,
    harmon: false,
    babbitt: false,
  });

  const areAllCheckboxesChecked = Object.values(checkboxes).every(checked => checked);

  // --- Initialize and Update Total Water Supply ---
  useEffect(() => {
    if ((window as any).totalWaterSupply !== undefined) {
      if (totalSupplyInput === '' || totalSupplyInput === (window as any).previousTotalWaterSupply) {
        const newSupply = Number((window as any).totalWaterSupply);
        setTotalSupplyInput(newSupply);
        (window as any).previousTotalWaterSupply = newSupply;
      }
    }
  }, [(window as any).totalWaterSupply]);

  // --- NEW: Initialize drain items from selected drains in drain mode ---
useEffect(() => {
  console.log('SewageCalculationForm useEffect triggered:', {
    sourceMode,
    selectedRiverData,
    windowSelectedRiverData: window.selectedRiverData
  });

  if (sourceMode === 'drain') {
    // Check both props and window for drain data
    const drainData = selectedRiverData?.allDrains || window.selectedRiverData?.allDrains;
    
    if (drainData && drainData.length > 0) {
      console.log('Found drain data, initializing drain items with Drain_No:', drainData);
      
      const newDrainItems: DrainItem[] = drainData.map((drain: any) => ({
        id: drain.id.toString(), // This is Drain_No
        name: drain.name || `Drain ${drain.id}`,
        discharge: '', // Start with empty discharge
      }));
      
      // Only update if the structure has changed (not discharge values)
      const currentStructure = drainItems.map(d => ({id: d.id, name: d.name}));
      const newStructure = newDrainItems.map(d => ({id: d.id, name: d.name}));
      
      if (!isEqual(currentStructure, newStructure)) {
        console.log('Updating drain items with Drain_No:', newDrainItems);
        setDrainCount(drainData.length);
        setDrainItems(newDrainItems);
      }
    } else {
      console.log('No drain data found, clearing drain items');
      setDrainCount(0);
      setDrainItems([]);
    }
  }
}, [sourceMode, selectedRiverData]);

  // --- Update Drain Items (only when not in drain mode or when manually changed) ---
  useEffect(() => {
    // Only auto-generate drain items if not in drain mode or if no selected river data exists
    if (sourceMode !== 'drain' || !(window as any).selectedRiverData?.allDrains) {
      if (typeof drainCount === 'number' && drainCount > 0) {
        const newDrainItems: DrainItem[] = Array.from({ length: drainCount }, (_, index) => ({
          id: `D${index + 1}`,
          name: `Drain ${index + 1}`,
          discharge: '',
        }));
        setDrainItems(newDrainItems);
      } else {
        setDrainItems([]);
      }
    }
  }, [drainCount, sourceMode]);

// Also add this additional useEffect to sync with window.selectedRiverData changes:

useEffect(() => {
  if (sourceMode === 'drain' && window.selectedRiverData?.allDrains) {
    const windowDrains = window.selectedRiverData.allDrains;
    console.log('Window selectedRiverData changed, checking for updates:', windowDrains);
    
    // Only update if we don't already have the same drain structure
    const currentIds = drainItems.map(d => d.id).sort();
    const windowIds = windowDrains.map(d => d.id.toString()).sort();
    
    if (!isEqual(currentIds, windowIds)) {
      console.log('Window drain data differs from current, updating...');
      
      const newDrainItems: DrainItem[] = windowDrains.map((drain: any) => {
        // Preserve existing discharge values if they exist
        const existingItem = drainItems.find(existing => existing.id === drain.id.toString());
        return {
          id: drain.id.toString(), // Drain_No as string
          name: drain.name || `Drain ${drain.id}`,
          discharge: existingItem?.discharge || '',
        };
      });
      
      setDrainCount(windowDrains.length);
      setDrainItems(newDrainItems);
    }
  }
}, [sourceMode]);

  // --- Calculate Total Drain Discharge ---
useEffect(() => {
    const total = drainItems.reduce((sum, item) => {
      return sum + (typeof item.discharge === 'number' ? item.discharge : 0);
    }, 0);
    setTotalDrainDischarge(total);
  }, [drainItems]);

  // --- Handlers ---
  const handleDomesticLoadMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDomesticLoadMethod(e.target.value as DomesticLoadMethod);
    setDomesticSewageResult(null);
    setShowPeakFlow(false);
    setShowRawSewage(false);
  };

  const handleDrainCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? '' : Number(e.target.value);
    setDrainCount(value);
  };

  const handleDrainItemChange = (index: number, field: keyof DrainItem, value: string | number) => {
    const newDrainItems = [...drainItems];
    if (field === 'discharge') {
      newDrainItems[index].discharge = value === '' ? '' : Number(value);
    } else {
      newDrainItems[index][field] = value as string;
    }
    setDrainItems(newDrainItems);
  };

  // Rest of your existing handlers and functions remain the same...
  const handleCalculateSewage = async () => {
    setError(null);
    setWaterSupplyResult(null);
    setDomesticSewageResult(null);
    setShowPeakFlow(false);
    setShowRawSewage(false);

    let hasError = false;
    const payloads: any[] = [];

    // --- Water Supply Payload ---
    if (totalSupplyInput === '' || Number(totalSupplyInput) <= 0) {
      setError(prev => prev ? `${prev} Invalid total water supply. ` : 'Invalid total water supply. ');
      hasError = true;
    } else {
      payloads.push({
        method: 'water_supply',
        total_supply: Number(totalSupplyInput),
        drain_items: drainItems.map(item => ({
          id: item.id,
          name: item.name,
          discharge: typeof item.discharge === 'number' ? item.discharge : 0
        })),
        total_drain_discharge: totalDrainDischarge
      });
    }

    // --- Domestic Sewage Payload ---
    if (!domesticLoadMethod) {
      setError(prev => prev ? `${prev} Please select a domestic sewage sector method. ` : 'Please select a domestic sewage sector method. ');
      hasError = true;
    } else {
      const payload: any = {
        method: 'domestic_sewage',
        load_method: domesticLoadMethod,
        drain_items: drainItems.map(item => ({
          id: item.id,
          name: item.name,
          discharge: typeof item.discharge === 'number' ? item.discharge : 0
        })),
        total_drain_discharge: totalDrainDischarge
      };
      if (domesticLoadMethod === 'manual') {
        if (domesticSupplyInput === '' || Number(domesticSupplyInput) <= 0) {
          setError(prev => prev ? `${prev} Invalid domestic supply. ` : 'Invalid domestic supply. ');
          hasError = true;
        } else {
          payload.domestic_supply = Number(domesticSupplyInput);
          payloads.push(payload);
        }
      } else if (domesticLoadMethod === 'modeled') {
        payload.unmetered_supply = Number(unmeteredSupplyInput);
        payload.computed_population = computedPopulation;
        payloads.push(payload);
      }
    }

    if (hasError) return;

    try {
      const responses = await Promise.all(payloads.map(payload =>
        fetch('http://localhost:9000/api/basic/sewage_calculation/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ));

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (!response.ok) {
          const err = await response.json();
          setError(prev => prev ? `${prev} ${err.error || 'Error calculating sewage.'} ` : err.error || 'Error calculating sewage.');
          continue;
        }
        const data = await response.json();
        if (payloads[i].method === 'water_supply') {
          setWaterSupplyResult(data.sewage_demand);
        } else if (payloads[i].method === 'domestic_sewage') {
          if (payloads[i].load_method === 'manual') {
            setDomesticSewageResult(data.sewage_demand);
          } else {
            setDomesticSewageResult(data.sewage_result);
          }
        }
      }

      if (waterSupplyResult || domesticSewageResult) {
        setShowPeakFlow(true);
      }
    } catch (error) {
      console.error(error);
      setError('Error connecting to backend.');
    }
  };

  const handlePeakFlowMethodToggle = (method: keyof typeof peakFlowMethods) => {
    setPeakFlowMethods({
      ...peakFlowMethods,
      [method]: !peakFlowMethods[method],
    });
  };

  const handlePeakFlowSewageSourceChange = (source: PeakFlowSewageSource) => {
    setPeakFlowSewageSource(source);
  };

  const getCPHEEOFactor = (pop: number) => {
    if (pop < 20000) return 3.0;
    if (pop <= 50000) return 2.5;
    if (pop <= 75000) return 2.25;
    return 2.0;
  };

  const getHarmonFactor = (pop: number) => 1 + 14 / (4 + Math.sqrt(pop / 1000));
  const getBabbittFactor = (pop: number) => 5 / (pop / 1000) ** 0.2;

  const calculateDrainBasedSewFlow = (popVal: number) => {
    if (totalDrainDischarge <= 0) return 0;
    const referencePopulation = (window as any).population2025;
    if (referencePopulation && referencePopulation > 0) {
      return (popVal / referencePopulation) * totalDrainDischarge;
    }
    return totalDrainDischarge;
  };

  const calculatewaterBasedSewFlow = (popVal: number) => {
    if (totalSupplyInput == 0) return 0;
    const referencePopulation = (window as any).population2025;
    if (referencePopulation && referencePopulation > 0) {
      return (popVal / referencePopulation) * totalSupplyInput;
    }
    return totalSupplyInput;
  };

  const handleCalculatePeakFlow = () => {
    if (!computedPopulation || (!waterSupplyResult && !domesticSewageResult)) {
      alert('Population or sewage data not available.');
      return;
    }
    const selectedMethods = Object.entries(peakFlowMethods)
      .filter(([_, selected]) => selected)
      .map(([method]) => method);
    if (selectedMethods.length === 0) {
      alert('Please select at least one Peak Flow method.');
      return;
    }

    const sewageResult = domesticLoadMethod === 'modeled' ? domesticSewageResult : (waterSupplyResult || domesticSewageResult);

    const rows = Object.keys(sewageResult || {}).map((year) => {
      const popVal = computedPopulation[year] || 0;
      const popBasedSewFlow = sewageResult[year] || 0;
      const drainBasedSewFlow = calculateDrainBasedSewFlow(popVal);
      const waterBasedSewFlow = calculatewaterBasedSewFlow(popVal);

      let avgSewFlow;
      if (peakFlowSewageSource === 'drain_based' && domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) {
        avgSewFlow = drainBasedSewFlow;
      } else if (peakFlowSewageSource === 'water_based' && (window as any).totalWaterSupply > 0) {
        avgSewFlow = waterBasedSewFlow;
      } else {
        avgSewFlow = popBasedSewFlow;
      }

      const row: any = {
        year,
        population: popVal,
        avgSewFlow: avgSewFlow.toFixed(2)
      };

      if (selectedMethods.includes('cpheeo')) {
        row.cpheeo = (avgSewFlow * getCPHEEOFactor(popVal)).toFixed(2);
      }
      if (selectedMethods.includes('harmon')) {
        row.harmon = (avgSewFlow * getHarmonFactor(popVal)).toFixed(2);
      }
      if (selectedMethods.includes('babbitt')) {
        row.babbitt = (avgSewFlow * getBabbittFactor(popVal)).toFixed(2);
      }
      return row;
    });

    const tableJSX = (
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Year</th>
            <th className="border px-2 py-1">Population</th>
            <th className="border px-2 py-1">Avg Sewage Flow (MLD)</th>
            {selectedMethods.includes('cpheeo') && (
              <th className="border px-2 py-1">CPHEEO Peak (MLD)</th>
            )}
            {selectedMethods.includes('harmon') && (
              <th className="border px-2 py-1">Harmon's Peak (MLD)</th>
            )}
            {selectedMethods.includes('babbitt') && (
              <th className="border px-2 py-1">Babbit's Peak (MLD)</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">{row.year}</td>
              <td className="border px-2 py-1">{row.population.toLocaleString()}</td>
              <td className="border px-2 py-1">{row.avgSewFlow}</td>
              {selectedMethods.includes('cpheeo') && (
                <td className="border px-2 py-1">{row.cpheeo}</td>
              )}
              {selectedMethods.includes('harmon') && (
                <td className="border px-2 py-1">{row.harmon}</td>
              )}
              {selectedMethods.includes('babbitt') && (
                <td className="border px-2 py-1">{row.babbitt}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
    setPeakFlowTable(tableJSX);
  };

  const handleCalculateRawSewage = () => {
    const basePop = computedPopulation["2011"] || 0;
    const baseCoefficient = basePop >= 1000000 ? 150 : 135;
    const unmetered = Number(unmeteredSupplyInput) || 0;
    const totalCoefficient = (baseCoefficient + unmetered) * 0.80;

    const tableRows = pollutionItemsState.map((item, index) => {
      const concentration = (item.perCapita / totalCoefficient) * 1000;
      return (
        <tr key={index}>
          <td className="border px-2 py-1">{item.name}</td>
          <td className="border px-2 py-1">
            <input
              type="number"
              value={item.perCapita}
              onChange={(e) => {
                const newVal = Number(e.target.value);
                setPollutionItemsState(prev => {
                  const newItems = [...prev];
                  newItems[index] = { ...newItems[index], perCapita: newVal };
                  return newItems;
                });
              }}
              className="w-20 border rounded px-1 py-0.5"
            />
          </td>
          <td className="border px-2 py-1">{concentration.toFixed(1)}</td>
          <td className="border px-2 py-1">
            <input
              type="number"
              value={item.designCharacteristic || concentration.toFixed(1)}
              onChange={(e) => {
                const newVal = Number(e.target.value);
                setPollutionItemsState(prev => {
                  const newItems = [...prev];
                  newItems[index] = {
                    ...newItems[index],
                    designCharacteristic: newVal
                  };
                  return newItems;
                });
              }}
              className="w-20 border rounded px-1 py-0.5"
            />
          </td>
        </tr>
      );
    });

    const tableJSX = (
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Item</th>
            <th className="border px-2 py-1">Per Capita Contribution (g/c/d)</th>
            <th className="border px-2 py-1">Concentration (mg/l)</th>
            <th className="border px-2 py-1">Design Characteristic (mg/l)</th>
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    );
    setRawSewageTable(tableJSX);
    setShowRawSewage(true);
  };

  const rawSewageJSX = useMemo(() => {
    const basePop = computedPopulation["2011"] || 0;
    const baseCoefficient = basePop >= 1000000 ? 150 : 135;
    const unmetered = Number(unmeteredSupplyInput) || 0;
    const totalCoefficient = (baseCoefficient + unmetered) * 0.80;

    return (
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Item</th>
            <th className="border px-2 py-1">Per Capita Contribution (g/c/d)</th>
            <th className="border px-2 py-1">Raw Sewage Characteristics (mg/l)</th>
            <th className="border px-2 py-1">Design Characteristics (mg/l)</th>
          </tr>
        </thead>
        <tbody>
          {pollutionItemsState.map((item, index) => {
            const concentration = (item.perCapita / totalCoefficient) * 1000;
            return (
              <tr key={index}>
                <td className="border px-2 py-1">{item.name}</td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    value={item.perCapita}
                    onChange={(e) => {
                      const newVal = Number(e.target.value);
                      setPollutionItemsState(prev => {
                        const newItems = [...prev];
                        newItems[index] = { ...newItems[index], perCapita: newVal };
                        return newItems;
                      });
                    }}
                    className="w-20 border rounded px-1 py-0.5"
                  />
                </td>
                <td className="border px-2 py-1">{concentration.toFixed(1)}</td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    value={item.designCharacteristic || concentration.toFixed(1)}
                    onChange={(e) => {
                      const newVal = Number(e.target.value);
                      setPollutionItemsState(prev => {
                        const newItems = [...prev];
                        newItems[index] = {
                          ...newItems[index],
                          designCharacteristic: newVal
                        };
                        return newItems;
                      });
                    }}
                    className="w-20 border rounded px-1 py-0.5"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }, [pollutionItemsState, unmeteredSupplyInput, computedPopulation]);

const drainItemsTableJSX = (
    <div className="mt-4">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Drain ID</th>
            <th className="border px-2 py-1">Drain Name</th>
            <th className="border px-2 py-1">Discharge (MLD)</th>
          </tr>
        </thead>
        <tbody>
          {drainItems.map((item, index) => (
            <tr key={index}>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => handleDrainItemChange(index, 'id', e.target.value)}
                  className={`w-20 border rounded px-1 py-0.5 ${sourceMode === 'drain' ? 'bg-gray-100' : ''}`}
                  readOnly={sourceMode === 'drain'}
                  title={sourceMode === 'drain' ? 'Drain ID is automatically set from drain selection' : ''}
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleDrainItemChange(index, 'name', e.target.value)}
                  className={`w-full border rounded px-1 py-0.5 ${sourceMode === 'drain' ? 'bg-gray-100' : ''}`}
                  readOnly={sourceMode === 'drain'}
                  title={sourceMode === 'drain' ? 'Drain name is automatically set from drain selection' : ''}
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="number"
                  value={item.discharge}
                  onChange={(e) => handleDrainItemChange(index, 'discharge', e.target.value)}
                  className="w-20 border rounded px-1 py-0.5"
                  min="0"
                  step="0.01"
                />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="border px-2 py-1 font-bold text-right">
              Total Discharge:
            </td>
            <td className="border px-2 py-1 font-bold">
              {totalDrainDischarge.toFixed(2)} MLD
            </td>
          </tr>
        </tbody>
      </table>
      {sourceMode === 'drain' && (
        <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
          <strong>Note:</strong> Drain IDs and names are automatically populated from your drain selection. 
          You can only modify the discharge values.
        </div>
      )}
    </div>
  );

  const handle1pdfDownload = () => {
    // Your existing PDF download code remains the same...
    const doc = new jsPDF();
    // ... rest of PDF generation code
  };

  const handleCheckboxChange = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

return (
  <div className="p-6 border rounded-lg bg-gradient-to-br from-white to-gray-50 shadow-lg space-y-8">
    <div className="flex items-center mb-4">
      <h3 className="text-2xl font-bold text-gray-800">Sewage Calculation</h3>
      {sourceMode === 'drain' && (
        <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
          Drain Mode
        </span>
      )}
    </div>

    {/* Water Supply Method Container */}
    <div className="p-4 border rounded-lg bg-gray-50/50 shadow-sm">
      <h4 className="text-lg font-semibold text-gray-800 mb-3">Water Supply Method</h4>
      <div className="mb-4">
        <label htmlFor="total_supply_input" className="block text-sm font-medium text-gray-700">
          Total Water Supply (MLD):
        </label>
        <input
          type="number"
          id="total_supply_input"
          value={totalSupplyInput}
          onChange={(e) =>
            setTotalSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
          }
          className="mt-2 block w-full sm:w-1/3 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="Enter total supply"
          min="0"
        />
      </div>
      {waterSupplyResult && (
        <div className="mt-4 p-4 border rounded-lg bg-green-50/50 shadow-sm">
          <h4 className="font-semibold text-lg text-green-700">Sewage Generation (Water Supply):</h4>
          {typeof waterSupplyResult === 'number' ? (
            <p className="text-xl font-medium text-gray-800">{waterSupplyResult.toFixed(2)} MLD</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100">
              <table className="table-auto w-full min-w-[600px] bg-white border border-gray-300 rounded-lg shadow-md">
                <thead className="bg-gradient-to-r from-blue-100 to-blue-200 sticky top-0 z-10">
                  <tr>
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Year</th>
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Forecasted Population</th>
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Sewage Generation (MLD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(waterSupplyResult).map(([year, value], index) => (
                    <tr key={year} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{year}</td>
                      <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{computedPopulation[year]?.toLocaleString() || '0'}</td>
                      <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{Number(value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Drain Tapping Input */}
    <div className="p-4 border rounded-lg bg-gray-50/50 shadow-sm">
      <h4 className="font-semibold text-lg text-gray-800 mb-3">Drain Tapping Information</h4>
      {sourceMode !== 'drain' && (
        <>
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            Number Of Drains to be Tapped
            {/* Assuming a tooltip similar to previous components */}
            <div className="relative ml-2 group">
              <span className="flex items-center justify-center h-5 w-5 text-sm bg-blue-600 text-white rounded-full cursor-help transition-transform hover:scale-110">i</span>
              <div className="absolute z-10 hidden group-hover:block w-64 text-gray-700 text-xs rounded-lg p-3 bg-white shadow-xl -mt-12 ml-6 border border-gray-200">
                Enter the number of drains to be tapped for sewage calculation.
              </div>
            </div>
          </label>
          <input
            type="number"
            id="drain_count"
            value={drainCount}
            onChange={handleDrainCountChange}
            className="mt-2 block w-full sm:w-1/3 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter number of drains"
            min="0"
          />
        </>
      )}
      {sourceMode === 'drain' && (
        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-blue-800">Drain Mode Active</span>
          </div>
          <p className="text-sm text-blue-700">
            Drain information is automatically populated from your drain selection.
            Number of drains: <strong>{drainItems.length}</strong>
          </p>
        </div>
      )}
      {drainCount && drainCount > 0 && (
        <div className="mt-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100">
          {drainItemsTableJSX}
        </div>
      )}
    </div>

    {/* Domestic Sewage Load Estimation Container */}
    <div className="p-4 border rounded-lg bg-gray-50/50 shadow-sm">
      <h4 className="text-lg font-semibold text-gray-800 mb-3">Domestic Sewage Load Estimation</h4>
      <div className="mb-4">
        <label htmlFor="domestic_load_method" className="block text-sm font-medium text-gray-700">
          Select Sector:
        </label>
        <select
          id="domestic_load_method"
          value={domesticLoadMethod}
          onChange={handleDomesticLoadMethodChange}
          className="mt-2 block w-full sm:w-1/3 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <option value="">-- Choose Option --</option>
          <option value="manual">Manual</option>
          <option value="modeled">Modeled</option>
        </select>
        {domesticLoadMethod === 'manual' && (
          <div className="mt-4">
            <label htmlFor="domestic_supply_input" className="block text-sm font-medium text-gray-700">
              Domestic Water Supply (MLD):
            </label>
            <input
              type="number"
              id="domestic_supply_input"
              value={domesticSupplyInput}
              onChange={(e) =>
                setDomesticSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="mt-2 block w-full sm:w-1/3 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter domestic supply"
              min="0"
            />
          </div>
        )}
        {domesticLoadMethod === 'modeled' && (
          <div className="mt-4">
            <label htmlFor="unmetered_supply_input" className="block text-sm font-medium text-gray-700">
              Unmetered Water Supply (optional):
            </label>
            <input
              type="number"
              id="unmetered_supply_input"
              value={unmeteredSupplyInput}
              onChange={(e) =>
                setUnmeteredSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="mt-2 block w-full sm:w-1/3 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter unmetered supply"
              min="0"
            />
          </div>
        )}
      </div>
      {domesticSewageResult && (
        <div className="mt-4 p-4 border rounded-lg bg-green-50/50 shadow-sm">
          <h4 className="font-semibold text-lg text-green-700">Sewage Generation (Domestic):</h4>
          {typeof domesticSewageResult === 'number' ? (
            <p className="text-xl font-medium text-gray-800">{domesticSewageResult.toFixed(2)} MLD</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100">
              <table className="table-auto w-full min-w-[600px] bg-white border border-gray-300 rounded-lg shadow-md">
                <thead className="bg-gradient-to-r from-blue-100 to-blue-200 sticky top-0 z-10">
                  <tr>
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Year</th>
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Forecasted Population</th>
                    {(window as any).totalWaterSupply > 0 && (
                      <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Water Based Sewage Generation (MLD)</th>
                    )}
                    <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Population Based Sewage Generation (MLD)</th>
                    {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                      <th className="border-b border-gray-300 px-6 py-3 text-left text-sm font-semibold text-gray-800">Drains Based Sewage Generation (MLD)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domesticSewageResult).map(([year, value], index) => {
                    const forecastData = (window as any).selectedPopulationForecast;
                    const domesticPop = forecastData[year] ?? "";
                    const drainsSewage = calculateDrainBasedSewFlow(domesticPop);
                    const waterSewage = calculatewaterBasedSewFlow(domesticPop);
                    return (
                      <tr key={year} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{year}</td>
                        <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{domesticPop.toLocaleString()}</td>
                        {(window as any).totalWaterSupply > 0 && (
                          <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{waterSewage > 0 ? waterSewage.toFixed(6) : "0.000000"}</td>
                        )}
                        <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{Number(value).toFixed(2)}</td>
                        {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                          <td className="border-b border-gray-200 px-6 py-3 text-gray-700">{drainsSewage > 0 ? drainsSewage.toFixed(6) : "0.000000"}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

    <div className="flex items-center space-x-4">
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        onClick={handleCalculateSewage}
      >
        Calculate Sewage
      </button>
      {error && <div className="text-red-600 font-medium">{error}</div>}
    </div>

    {showPeakFlow && (
      <div className="p-4 border rounded-lg bg-blue-50/50 shadow-sm">
        <h5 className="font-semibold text-lg text-blue-700 mb-3">Peak Sewage Flow Calculation</h5>
        {(domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) || (window as any).totalWaterSupply > 0 ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Sewage Generation Source for Peak Flow Calculation:
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="peakFlowSewageSource"
                  checked={peakFlowSewageSource === 'population_based'}
                  onChange={() => handlePeakFlowSewageSourceChange('population_based')}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Population Based Sewage Generation</span>
              </label>
              {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="peakFlowSewageSource"
                    checked={peakFlowSewageSource === 'drain_based'}
                    onChange={() => handlePeakFlowSewageSourceChange('drain_based')}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Drain Based Sewage Generation</span>
                </label>
              )}
              {(window as any).totalWaterSupply > 0 && (
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="peakFlowSewageSource"
                    checked={peakFlowSewageSource === 'water_based'}
                    onChange={() => handlePeakFlowSewageSourceChange('water_based')}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Water Based Sewage Generation</span>
                </label>
              )}
            </div>
          </div>
        ) : null}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Peak Sewage Flow Methods:
          </label>
          <div className="flex flex-wrap gap-4 mt-2">
            {[
              { key: 'cpheeo', label: 'CPHEEO Method' },
              { key: 'harmon', label: "Harmon's Method" },
              { key: 'babbitt', label: "Babbit's Method" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={peakFlowMethods[key]}
                  onChange={() => handlePeakFlowMethodToggle(key)}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          onClick={handleCalculatePeakFlow}
        >
          Calculate Peak Sewage Flow
        </button>
        {peakFlowTable && (
          <div className="mt-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100">
            {peakFlowTable}
          </div>
        )}
      </div>
    )}

    <div className="p-4 border rounded-lg bg-blue-50/50 shadow-sm">
      <h5 className="font-semibold text-lg text-blue-700 mb-3">Raw Sewage Characteristics</h5>
      <button
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        onClick={handleCalculateRawSewage}
      >
        Calculate Raw Sewage Characteristics
      </button>
      {showRawSewage && (
        <div className="mt-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100">
          {rawSewageJSX}
        </div>
      )}
    </div>

    <div className="p-4 border rounded-lg bg-gray-50/50 shadow-sm">
      <h5 className="font-semibold text-lg text-gray-800 mb-3">Report Checklist</h5>
      <p className="text-sm text-gray-600 mb-4">
        Please confirm completion of the following sections to enable the comprehensive report download.
      </p>
      <div className="space-y-2">
        {[
          { key: 'populationForecasting', label: 'Population Forecasting' },
          { key: 'waterDemand', label: 'Water Demand' },
          { key: 'waterSupply', label: 'Water Supply' },
          { key: 'sewageCalculation', label: 'Sewage Calculation' },
          { key: 'rawSewageCharacteristics', label: 'Raw Sewage Characteristics' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={checkboxes[key]}
              onChange={() => handleCheckboxChange(key)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="flex justify-center">
      <button
        className={`text-white font-medium py-2 px-6 rounded-lg transition duration-300 ease-in-out shadow-md w-full sm:w-auto ${areAllCheckboxesChecked
          ? 'bg-purple-600 hover:bg-purple-700'
          : 'bg-gray-400 cursor-not-allowed'
          }`}
        onClick={handle1pdfDownload}
        disabled={!areAllCheckboxesChecked}
      >
        Download Comprehensive Report
      </button>
    </div>
  </div>
);
};

export default SewageCalculationForm;