// components/SewageCalculationForm.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type SewageMethod = 'water_supply' | 'domestic_sewage' | '';
type DomesticLoadMethod = 'manual' | 'modeled' | '';
// Add a new type for peak flow calculation method
type PeakFlowSewageSource = 'population_based' | 'drain_based' | '';

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


const SewageCalculationForm: React.FC = () => {
  // --- Sewage Calculation States ---
  const [sewageMethod, setSewageMethod] = useState<SewageMethod>('');
  const [domesticLoadMethod, setDomesticLoadMethod] = useState<DomesticLoadMethod>('');
  const [totalSupplyInput, setTotalSupplyInput] = useState<number | ''>('');
  const [domesticSupplyInput, setDomesticSupplyInput] = useState<number | ''>('');
  // Unmetered Water Supply (optional) input is used for both sewage calculation (modeled) and raw characteristics.
  const [unmeteredSupplyInput, setUnmeteredSupplyInput] = useState<number | ''>(0);
  const [sewageResult, setSewageResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPeakFlow, setShowPeakFlow] = useState(false);

  // --- New state to track which sewage generation method to use for peak flow ---
  const [peakFlowSewageSource, setPeakFlowSewageSource] = useState<PeakFlowSewageSource>('population_based');

  // --- New state: show raw sewage table only when calculated ---
  const [showRawSewage, setShowRawSewage] = useState(false);

  // --- New state for drain tapping ---
  const [drainCount, setDrainCount] = useState<number | ''>(0);
  const [drainItems, setDrainItems] = useState<DrainItem[]>([]);
  const [totalDrainDischarge, setTotalDrainDischarge] = useState<number>(0);

  const computedPopulation: { [year: string]: number } = (window as any).selectedPopulationForecast || {};

  // --- Raw Sewage Characteristics State (editable pollution items) ---
  const [pollutionItemsState, setPollutionItemsState] = useState<PollutionItem[]>(defaultPollutionItems);
  // Declare rawSewageTable state (if needed elsewhere)
  const [rawSewageTable, setRawSewageTable] = useState<JSX.Element | null>(null);

  // --- Peak Sewage Flow States ---
  const [peakFlowMethods, setPeakFlowMethods] = useState({
    cpheeo: false,
    harmon: false,
    babbitt: false,
  });
  const [peakFlowTable, setPeakFlowTable] = useState<JSX.Element | null>(null);

  // check for the total water supply value from the previous stage and set it in totalSupplyInput.
  useEffect(() => {
    if (sewageMethod === 'water_supply' && (window as any).totalWaterSupply) {
      setTotalSupplyInput(Number((window as any).totalWaterSupply));
    }
  }, [sewageMethod]);

  // Update drain items when drain count changes
  useEffect(() => {
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
  }, [drainCount]);

  // Calculate total drain discharge whenever drain items change
  useEffect(() => {
    const total = drainItems.reduce((sum, item) => {
      return sum + (typeof item.discharge === 'number' ? item.discharge : 0);
    }, 0);
    setTotalDrainDischarge(total);
  }, [drainItems]);

// -------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------
  // --- Handlers for Sewage Calculation ---
  const handleSewageMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SewageMethod;
    setSewageMethod(value);
    setDomesticLoadMethod('');
    setSewageResult(null);
    setShowPeakFlow(false);
    setShowRawSewage(false);
    setError(null);
  };

  const handleDomesticLoadMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDomesticLoadMethod(e.target.value as DomesticLoadMethod);
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

  const handleCalculateSewage = async () => {
    setError(null);
    let payload: any = { method: sewageMethod };

    if (sewageMethod === 'water_supply') {
      if (totalSupplyInput === '' || Number(totalSupplyInput) <= 0) {
        setError('Please enter a valid total water supply.');
        return;
      }
      payload.total_supply = Number(totalSupplyInput);
    } else if (sewageMethod === 'domestic_sewage') {
      if (!domesticLoadMethod) {
        setError('Please select a domestic sewage sector method.');
        return;
      }
      payload.load_method = domesticLoadMethod;
      if (domesticLoadMethod === 'manual') {
        if (domesticSupplyInput === '' || Number(domesticSupplyInput) <= 0) {
          setError('Please enter a valid domestic supply.');
          return;
        }
        payload.domestic_supply = Number(domesticSupplyInput);
      } else if (domesticLoadMethod === 'modeled') {
        payload.unmetered_supply = Number(unmeteredSupplyInput);
        payload.computed_population = computedPopulation;
      }
    } else {
      setError('Please select a sewage method.');
      return;
    }

    // Add drain data to payload
    payload.drain_items = drainItems.map(item => ({
      id: item.id,
      name: item.name,
      discharge: typeof item.discharge === 'number' ? item.discharge : 0
    }));
    payload.total_drain_discharge = totalDrainDischarge;

    try {
      const response = await fetch('http://localhost:9000/api/basic/sewage_calculation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Error calculating sewage.');
        return;
      }
      const data = await response.json();
      if (sewageMethod === 'water_supply' || domesticLoadMethod === 'manual') {
        setSewageResult(data.sewage_demand);
      } else if (domesticLoadMethod === 'modeled') {
        setSewageResult(data.sewage_result);
      }
      setShowPeakFlow(true);
      // When sewage is calculated, hide raw sewage table until user clicks its button.
      setShowRawSewage(false);
    } catch (error) {
      console.error(error);
      setError('Error connecting to backend.');
    }
  };

  // --- Handlers for Peak Sewage Flow ---
  const handlePeakFlowMethodToggle = (method: keyof typeof peakFlowMethods) => {
    setPeakFlowMethods({
      ...peakFlowMethods,
      [method]: !peakFlowMethods[method],
    });
  };

  // Handlers for peak flow sewage source selection
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
  const getBabbittFactor = (pop: number) => 5 / (pop/1000)**0.2;

  // Helper function to calculate drain-based sewage flow
  const calculateDrainBasedSewFlow = (popVal: number) => {
    if (totalDrainDischarge <= 0) return 0;
    
    // Get all population values from computed population
    const populationValues = Object.values(computedPopulation);
    
    // If we have population data but no specific 2025 value, use the first year's population as reference
    if (populationValues.length > 0) {
      // Get first year population as reference (or any available population)
      const referencePopulation = populationValues[0];
      
      // Calculate the drain-based sewage flow using population ratio and total drain discharge
      if (referencePopulation && referencePopulation > 0) {
        return (popVal / referencePopulation) * totalDrainDischarge;
      }
    }
    
    // If no reference population is available, just return the total drain discharge
    return totalDrainDischarge;
  };

  const handleCalculatePeakFlow = () => {
    if (!computedPopulation || !sewageResult) {
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
    
    // Prepare rows based on selected sewage flow source
    const rows = Object.keys(sewageResult).map((year) => {
      const popVal = computedPopulation[year] || 0;
      const popBasedSewFlow = sewageResult[year] || 0;
      
      // Calculate drain-based sewage flow if needed
      const drainBasedSewFlow = calculateDrainBasedSewFlow(popVal);
      
      // Determine which sewage flow to use based on user selection
      let avgSewFlow: number;
      if (peakFlowSewageSource === 'drain_based' && domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) {
        avgSewFlow = drainBasedSewFlow;
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

  // --- Raw Sewage Characteristics Handler ---
  // Calculation:
  //   baseCoefficient = 150 if computedPopulation["2011"] >= 1,000,000 else 135.
  //   totalCoefficient = (baseCoefficient + unmeteredSupplyInput) * 0.80.
  //   For each pollution item, concentration = (perCapita / totalCoefficient) * 1000.
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
  
  // Update the memoized JSX similarly
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

  // Drain items table JSX
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
                  className="w-20 border rounded px-1 py-0.5"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleDrainItemChange(index, 'name', e.target.value)}
                  className="w-full border rounded px-1 py-0.5"
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
    </div>
  );

  const handlepdfDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Sewage Calculation Report", 14, 20);
    doc.setFontSize(12);
    doc.text("Sewage Method: " + sewageMethod, 14, 30);
    doc.text("Domestic Load Method: " + domesticLoadMethod, 14, 40);
    doc.text("Total Water Supply: " + totalSupplyInput, 14, 50);
    doc.text("Domestic Water Supply: " + domesticSupplyInput, 14, 60);
    doc.text("Unmetered Water Supply: " + unmeteredSupplyInput, 14, 70);
    
    // Add drain information
    doc.text("Number of Drains to be Tapped: " + drainCount, 14, 80);
    doc.text("Total Drain Discharge: " + totalDrainDischarge.toFixed(2) + " MLD", 14, 90);
    
    // Add drain items table
    doc.text("Drain Details:", 14, 100);
    const drainRows = drainItems.map((item) => [
      item.id,
      item.name,
      typeof item.discharge === 'number' ? item.discharge.toFixed(2) : '0.00'
    ]);
    autoTable(doc, {
      head: [["Drain ID", "Drain Name", "Discharge (MLD)"]],
      body: drainRows,
      startY: 110,
    });
    
    // Prepare pollution rows
    const yAfterDrains = ((doc as any).lastAutoTable?.finalY || 110) as number;
    doc.text("Pollution Items:", 14, yAfterDrains + 10);
    const pollutionRows = pollutionItemsState.map((item) => [item.name, item.perCapita]);
    autoTable(doc, {
      head: [["Item", "Per Capita Contribution (g/c/d)"]],
      body: pollutionRows,
      startY: yAfterDrains + 20,
    });
    
    const finalYAfterPollution = ((doc as any).lastAutoTable?.finalY || yAfterDrains + 20) as number;
    doc.text("Sewage Result:", 14, finalYAfterPollution + 10);
    const sewageRows = Object.entries(sewageResult).map(([year, value]: [string, unknown]) => [year, value as number]);
    autoTable(doc, {
      head: [["Year", "Sewage Generation (MLD)"]],
      body: sewageRows,
      startY: finalYAfterPollution + 15,
    });
    
    const finalYAfterSewage = ((doc as any).lastAutoTable?.finalY || finalYAfterPollution + 15) as number;
    doc.text("Peak Flow Calculation:", 14, finalYAfterSewage + 10);
    // If you have data for peak flow, construct the rows accordingly.
    // Here we assume you build peakRows from your peakFlowTable data.
    const peakRows: (string | number)[][] = [];// Build your peak flow rows here.
    autoTable(doc, {
      head: [["Year", "Population", "Avg Sewage Flow (MLD)", "CPHEEO Peak (MLD)", "Harmon's Peak (MLD)", "Babbitt's Peak (MLD)"]],
      body: peakRows,
      startY: finalYAfterSewage + 15,
    });
    
    const finalYAfterPeak = ((doc as any).lastAutoTable?.finalY || finalYAfterSewage + 15) as number;
    doc.text("Raw Sewage Characteristics:", 14, finalYAfterPeak + 10);
    // Similarly, extract raw sewage rows from your rawSewageTable data.
    const rawRows: (string | number)[][] = []; // Build raw sewage rows here.
    autoTable(doc, {
      head: [["Item", "Per Capita Contribution (g/c/d)", "Concentration (mg/l)"]],
      body: rawRows,
      startY: finalYAfterPeak + 15,
    });
    
    doc.save("Sewage_Calculation_Report.pdf");
  };
  
  return (
    <div className="p-4 border rounded bg-white space-y-8">
      <h3 className="text-xl font-semibold mb-3">Sewage Calculation</h3>
      
      
      
      {/* Sewage Method Selection */}
      <div className="mb-4">
        <label htmlFor="sewage_method" className="block text-sm font-medium">
          Select Sewage Method:
        </label>
        <select
          id="sewage_method"
          value={sewageMethod}
          onChange={handleSewageMethodChange}
          className="mt-1 block w-1/3 border rounded px-2 py-1"
        >
          <option value="">-- Choose Method --</option>
          <option value="domestic_sewage">Domestic Sewage Load Estimation</option>
          <option value="water_supply">Water Supply</option>
        </select>
      </div>

      {/* Conditional Fields Based on Selected Method */}
      {sewageMethod === 'water_supply' && (
        <div className="mb-4">
          <label htmlFor="total_supply_input" className="block text-sm font-medium">
            Total Water Supply (MLD):
          </label>
          <input
            type="number"
            id="total_supply_input"
            value={totalSupplyInput}
            onChange={(e) =>
              setTotalSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="mt-1 block w-1/3 border rounded px-2 py-1"
            placeholder="Enter total supply"
            min="0"
          />
        </div>
      )}

      {sewageMethod === 'domestic_sewage' && (
        <div className="mb-4">
          <label htmlFor="domestic_load_method" className="block text-sm font-medium">
            Select Sector:
          </label>
          <select
            id="domestic_load_method"
            value={domesticLoadMethod}
            onChange={handleDomesticLoadMethodChange}
            className="mt-1 block w-1/3 border rounded px-2 py-1"
          >
            <option value="">-- Choose Option --</option>
            <option value="manual">Manual</option>
            <option value="modeled">Modeled</option>
          </select>
          {domesticLoadMethod === 'manual' && (
            <div className="mt-4">
              <label htmlFor="domestic_supply_input" className="block text-sm font-medium">
                Domestic Water Supply (MLD):
              </label>
              <input
                type="number"
                id="domestic_supply_input"
                value={domesticSupplyInput}
                onChange={(e) =>
                  setDomesticSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="mt-1 block w-1/3 border rounded px-2 py-1"
                placeholder="Enter domestic supply"
                min="0"
              />
            </div>
          )}
          {domesticLoadMethod === 'modeled' && (
            <div className="mt-4">
              <label htmlFor="unmetered_supply_input" className="block text-sm font-medium">
                Unmetered Water Supply (optional):
              </label>
              <input
                type="number"
                id="unmetered_supply_input"
                value={unmeteredSupplyInput}
                onChange={(e) =>
                  setUnmeteredSupplyInput(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="mt-1 block w-1/3 border rounded px-2 py-1"
                placeholder="Enter unmetered supply"
                min="0"
              />
            </div>
          )}
        </div>
      )}

      {/* Drain Tapping Input - this is shown regardless of method selected */}
      <div className="mb-4 p-3 border rounded bg-gray-50">
        <h4 className="font-bold text-gray-700 mb-2">Drain Tapping Information</h4>
        <label htmlFor="drain_count" className="block text-sm font-medium">
          Number of Drains to be Tapped :
        </label>
        <input
          type="number"
          id="drain_count"
          value={drainCount}
          onChange={handleDrainCountChange}
          className="mt-1 block w-1/3 border rounded px-2 py-1"
          placeholder="Enter number of drains"
          min="0"
        />
        
        {drainCount && drainCount > 0 && drainItemsTableJSX}
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleCalculateSewage}
      >
        Calculate Sewage
      </button>

      {error && <div className="mt-4 text-red-500">{error}</div>}

      {sewageResult && (
        <div className="mt-4 p-3 border rounded bg-green-50">
          <h4 className="font-bold text-green-700">Sewage Generation:</h4>
          {typeof sewageResult === 'number' ? (
            <p>{sewageResult.toFixed(2)} MLD</p>
          ) : (
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Year</th>
                  <th className="border px-4 py-2">Forecasted Population</th>
                  <th className="border px-2 py-1">Population Based Sewage Generation (MLD)</th>
                  {/* Add drains based sewage column only for modeled method */}
                  {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                    <th className="border px-2 py-1">Drains Based Sewage Generation (MLD)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(sewageResult).map(([year, value]) => {
                  const forecastData = (window as any).selectedPopulationForecast;
                  const domesticPop = forecastData[year] ?? "";
                  // Calculate drains based sewage using our new helper function
                  const drainsSewage = calculateDrainBasedSewFlow(domesticPop);
                  
                  return (
                    <tr key={year}>
                      <td className="border px-2 py-1">{year}</td>
                      <td className="border px-4 py-2">{domesticPop}</td>
                      <td className="border px-2 py-1">{Number(value).toFixed(2)}</td>
                      {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                        <td className="border px-2 py-1">{drainsSewage > 0 ? drainsSewage.toFixed(6) : "0.000000"}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showPeakFlow && (
        <div className="mt-6 p-4 border rounded bg-blue-50">
          <h5 className="font-bold text-blue-700 mb-3">Peak Sewage Flow Calculation</h5>
          
          {/* New section for sewage source selection */}
          {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Sewage Generation Source for Peak Flow Calculation:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="peakFlowSewageSource"
                    checked={peakFlowSewageSource === 'population_based'}
                    onChange={() => handlePeakFlowSewageSourceChange('population_based')}
                    className="mr-2"
                  />
                  Population Based Sewage Generation
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="peakFlowSewageSource"
                    checked={peakFlowSewageSource === 'drain_based'}
                    onChange={() => handlePeakFlowSewageSourceChange('drain_based')}
                    className="mr-2"
                  />
                  Drain Based Sewage Generation
                </label>
              </div>
            </div>
          )}
          
          <div className="mb-3">
            <label className="block text-sm font-medium">
              Select Peak Sewage Flow Methods:
            </label>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={peakFlowMethods.cpheeo}
                  onChange={() => handlePeakFlowMethodToggle('cpheeo')}
                  className="mr-2"
                />
                CPHEEO Method
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={peakFlowMethods.harmon}
                  onChange={() => handlePeakFlowMethodToggle('harmon')}
                  className="mr-2"
                />
                Harmon's Method
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={peakFlowMethods.babbitt}
                  onChange={() => handlePeakFlowMethodToggle('babbitt')}
                  className="mr-2"
                />
                Babbit's Method
              </label>
            </div>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleCalculatePeakFlow}
          >
            Calculate Peak Sewage Flow
          </button>
          
          {peakFlowTable && <div className="mt-6">{peakFlowTable}</div>}
        </div>
      )}

      <div className="mt-6 p-4 border rounded bg-blue-50">
        <h5 className="font-bold text-blue-700 mb-3">Raw Sewage Characteristics</h5>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={handleCalculateRawSewage}
        >
          Calculate Raw Sewage Characteristics
        </button>
        {showRawSewage && <div className="mt-4">{rawSewageJSX}</div>}
        
      </div>
      {/* <button 
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 ml-300 mb-2 rounded-md transition duration-300 ease-in-out"
        onClick={handlepdfDownload}
      >
        Download Comprehensive Report
      </button> */}
      
      
    </div>
  );
};

export default SewageCalculationForm;