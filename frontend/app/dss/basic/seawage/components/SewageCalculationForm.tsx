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

{/*-----------------------------------------........................-------------------------------------------------------*/}


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
 // Helper function to calculate drain-based sewage flow
const calculateDrainBasedSewFlow = (popVal: number) => {
  if (totalDrainDischarge <= 0) return 0;
  
  // Use the fixed 2025 population from the window object
  const referencePopulation = (window as any).population2025;
  
  // Calculate the drain-based sewage flow using population ratio and total drain discharge
  if (referencePopulation && referencePopulation > 0) {
    return (popVal / referencePopulation) * totalDrainDischarge;
  }
  
  // If reference population is not available, just return the total drain discharge
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

  const handle1pdfDownload = () => {
    const doc = new jsPDF();
    
    // Document title and header with logos
    try {
      // Add logos to the header
      const addLogos = async () => {
        try {
          // Load left logo (IIT BHU)
          const iitLogo = new Image();
          iitLogo.crossOrigin = "Anonymous";
          const leftLogoPromise = new Promise((resolve, reject) => {
            iitLogo.onload = resolve;
            iitLogo.onerror = reject;
            iitLogo.src = "/images/export/logo_iitbhu.png"; // Path in public folder
          });
          
          // Load right logo
          const rightLogo = new Image();
          rightLogo.crossOrigin = "Anonymous";
          const rightLogoPromise = new Promise((resolve, reject) => {
            rightLogo.onload = resolve;
            rightLogo.onerror = reject;
            rightLogo.src = "/images/export/right1_slcr.png"; // Path in public folder for right logo
          });
          
          // Wait for both logos to load
          try {
            await Promise.all([leftLogoPromise, rightLogoPromise]);
            
            // Add left logo
            doc.addImage(iitLogo, 'PNG', 14, 5, 25, 25);
            
            // Add right logo (positioned at the right side of the page)
            const pageWidth = doc.internal.pageSize.width;
            doc.addImage(rightLogo, 'PNG', pageWidth - 39, 5, 25, 25);
            
          } catch (logoErr) {
            console.error("Error loading one or both logos:", logoErr);
          }
          
          // Proceed with the rest of the report generation
          continueWithReport();
        } catch (err) {
          console.error("Failed to load logos:", err);
          // Continue with report generation without logos
          continueWithReport();
        }
      };
      
      addLogos();
    } catch (error) {
      console.error("Error adding logos:", error);
      // Continue with report generation without logos
      continueWithReport();
    }
    
    // Main function to generate the report after logo attempt
    function continueWithReport() {
      // Document title and metadata
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.text("Comprehensive Report of Sewage Generation", doc.internal.pageSize.width / 2, 20, { align: 'center' });
      
      // Document metadata
      const today = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      // doc.text(`Generated on: ${today}`, 14, 30);
      
      let yPos = 40;
      
      // 1. POPULATION SECTION
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("1. Population Analysis", 14, yPos);
      yPos += 8;
      
      // Add Geographic Location information
      try {
        const locationData = (window as any).selectedLocations || {
          state: '',
          districts: [],
          subDistricts: [],
          villages: [],
          totalPopulation: 0
        };
        
        if (locationData && (locationData.state || locationData.districts.length > 0)) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("1.1 Geographic Location", 14, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          
          if (locationData.state) {
            doc.text(`State: ${locationData.state}`, 14, yPos);
            yPos += 5;
          }
          
          if (locationData.districts && locationData.districts.length > 0) {
            const districtsText = Array.isArray(locationData.districts)
              ? `Districts: ${locationData.districts.join(', ')}`
              : `Districts: ${locationData.districts.toString()}`;
            
            const districtLines = doc.splitTextToSize(districtsText, 180);
            doc.text(districtLines, 14, yPos);
            yPos += (districtLines.length * 5);
          }
          
          if (locationData.subDistricts && locationData.subDistricts.length > 0) {
            const subDistrictsText = Array.isArray(locationData.subDistricts)
              ? `Sub-Districts: ${locationData.subDistricts.join(', ')}`
              : `Sub-Districts: ${locationData.subDistricts.toString()}`;
            
            const subDistrictLines = doc.splitTextToSize(subDistrictsText, 180);
            doc.text(subDistrictLines, 14, yPos);
            yPos += (subDistrictLines.length * 5);
          }
          
          if (locationData.totalPopulation) {
            doc.setFont(undefined, 'bold');
            doc.text(`Total Population (2011): ${locationData.totalPopulation.toLocaleString()}`, 14, yPos);
            yPos += 8;
          }
          
          // Add village details if available
          if (locationData.villages && locationData.villages.length > 0) {
            const villagesText = Array.isArray(locationData.villages)
              ? `Villages: ${locationData.villages.join(', ')}`
              : `Villages: ${locationData.villages.toString()}`;
            
            const villageLines = doc.splitTextToSize(villagesText, 180);
            doc.text(villageLines, 14, yPos);
            yPos += (villageLines.length * 5);
            
            // Check if we need a new page
            if (yPos > 230 && locationData.allVillages && locationData.allVillages.length > 0) {
              doc.addPage();
              yPos = 20;
            }
            
            if (locationData.allVillages && locationData.allVillages.length > 0) {
              doc.setFont(undefined, 'bold');
              doc.text("1.2 Selected Villages with Population:", 14, yPos);
              yPos += 8;
              
              const villageRows = locationData.allVillages.map(village => [
                village.name,
                village.subDistrict,
                village.district,
                village.population.toLocaleString()
              ]);
              
              autoTable(doc, {
                head: [['Village Name', 'Sub-District', 'District', 'Population (2011)']],
                body: villageRows,
                startY: yPos,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [66, 139, 202] },
              });
              
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
          }
          
          // Population forecast
          const populationData = (window as any).selectedPopulationForecast || {};
          if (Object.keys(populationData).length > 0) {
            // Check if we need a new page
            if (yPos > 230) {
              doc.addPage();
              yPos = 20;
            }
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("1.3 Population Forecast", 14, yPos);
            yPos += 8;
            
            const popYears = Object.keys(populationData).sort();
            if (popYears.length > 0) {
              const popRows = popYears.map(year => [
                year,
                Math.round(populationData[year] || 0).toLocaleString()
              ]);
              
              autoTable(doc, {
                head: [['Year', 'Projected Population']],
                body: popRows,
                startY: yPos,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [66, 139, 202] },
              });
              
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
          }
        }
      } catch (error) {
        console.error("Error adding location data:", error);
        yPos += 5;
      }
      
      // 2. WATER DEMAND SECTION
      // Check if we need a new page
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("2. Water Demand Analysis", 14, yPos);
      yPos += 8;
      
      try {
        const waterDemandData = (window as any).totalWaterDemand || {};
        const populationData = (window as any).selectedPopulationForecast || {};
        
        if (Object.keys(waterDemandData).length > 0) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text("Water demand is estimated based on various contributing factors including domestic, floating,", 14, yPos);
          yPos += 5;
          doc.text("commercial, institutional, and firefighting demands as per CPHEEO manual guidelines.", 14, yPos);
          yPos += 10;
          
          const waterDemandYears = Object.keys(waterDemandData).sort();
          if (waterDemandYears.length > 0) {
            const waterDemandRows = waterDemandYears.map(year => [
              year,
              Math.round(populationData[year] || 0).toLocaleString(),
              waterDemandData[year].toFixed(2)
            ]);
            
            autoTable(doc, {
              head: [['Year', 'Population', 'Water Demand (MLD)']],
              body: waterDemandRows,
              startY: yPos,
              styles: { fontSize: 10 },
              headStyles: { fillColor: [66, 139, 202] },
            });
            
            yPos = (doc as any).lastAutoTable.finalY + 10;
          }
        } else {
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text("Water demand data not available", 14, yPos);
          yPos += 10;
        }
      } catch (error) {
        console.error("Error adding water demand data:", error);
        yPos += 5;
      }
      
      // 3. WATER SUPPLY SECTION
      // Check if we need a new page
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("3. Water Supply Analysis", 14, yPos);
      yPos += 8;
      
      try {
        const waterSupply = (window as any).totalWaterSupply || 0;
        const waterDemandData = (window as any).totalWaterDemand || {};
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Water supply plays a critical role in determining sewage generation within a region.", 14, yPos);
        yPos += 5;
        
        if (waterSupply > 0) {
          doc.text(`The estimated total water supply is: ${waterSupply.toFixed(2)} MLD (Million Liters per Day)`, 14, yPos);
          yPos += 10;
          
          // Basic information about water supply method
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("3.1 Water Supply Details", 14, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          
          if (sewageMethod === 'water_supply') {
            doc.text("Total Water Supply:", 14, yPos);
            doc.text(`${totalSupplyInput} MLD`, 80, yPos);
            yPos += 5;
          }
          
          // Unmetered supply if applicable
          if (unmeteredSupplyInput) {
            doc.text("Unmetered Water Supply:", 14, yPos);
            doc.text(`${unmeteredSupplyInput} MLD`, 80, yPos);
            yPos += 5;
          }
          
          // Water Gap Analysis
          yPos += 5;
          const waterDemandYears = Object.keys(waterDemandData).sort();
          if (waterDemandYears.length > 0) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("3.2 Water Gap Analysis", 14, yPos);
            yPos += 8;
            
            const waterGapRows = waterDemandYears.map(year => {
              const demand = waterDemandData[year];
              const gap = waterSupply - demand;
              const status = gap >= 0 ? 'Sufficient' : 'Deficit';
              
              return [
                year,
                waterSupply.toFixed(2),
                demand.toFixed(2),
                gap.toFixed(2),
                status
              ];
            });
            
            autoTable(doc, {
              head: [['Year', 'Supply (MLD)', 'Demand (MLD)', 'Gap (MLD)', 'Status']],
              body: waterGapRows,
              startY: yPos,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [66, 139, 202] },
            });
            
            yPos = (doc as any).lastAutoTable.finalY + 10;
          }
        } else {
          doc.setFont(undefined, 'italic');
          doc.text("Water supply data not available", 14, yPos);
          yPos += 10;
        }
      } catch (error) {
        console.error("Error adding water supply data:", error);
        yPos += 5;
      }
      
      // 4. SEWAGE GENERATION SECTION
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("4. Sewage Generation Analysis", 14, yPos);
      yPos += 8;
      
      // Basic sewage information
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.1 Calculation Method", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Sewage Calculation Method:", 14, yPos);
      doc.text(sewageMethod === 'water_supply' ? "Water Supply Method" : 
               "Domestic Sewage Load Estimation", 80, yPos);
      yPos += 5;
      
      if (sewageMethod === 'domestic_sewage') {
        doc.text("Domestic Load Method:", 14, yPos);
        doc.text(domesticLoadMethod === 'manual' ? "Manual Input" : "Population-based Modeling", 80, yPos);
        yPos += 5;
        
        if (domesticLoadMethod === 'manual') {
          doc.text("Domestic Water Supply:", 14, yPos);
          doc.text(`${domesticSupplyInput} MLD`, 80, yPos);
          yPos += 5;
        }
      }
      
      yPos += 5;
      
      // Add drain information
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.2 Drain Information", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Number of Drains to be Tapped:", 14, yPos);
      doc.text(`${drainCount}`, 80, yPos);
      yPos += 5;
      
      doc.text("Total Drain Discharge:", 14, yPos);
      doc.text(`${totalDrainDischarge.toFixed(2)} MLD`, 80, yPos);
      yPos += 10;
      
      // Add drain items table if drains exist
      if (drainItems.length > 0) {
        const drainRows = drainItems.map((item) => [
          item.id,
          item.name,
          typeof item.discharge === 'number' ? `${item.discharge.toFixed(2)} MLD` : '0.00 MLD'
        ]);
        
        autoTable(doc, {
          head: [["Drain ID", "Drain Name", "Discharge (MLD)"]],
          body: drainRows,
          startY: yPos,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] },
        });
        
        // Update yPos after the table
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      // Sewage Generation Results
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.3 Sewage Generation Results", 14, yPos);
      yPos += 8;
      
      if (sewageResult) {
        if (typeof sewageResult === 'number') {
          // For single value result
          const sewageRows = [["Sewage Generation", `${sewageResult.toFixed(2)} MLD`]];
          autoTable(doc, {
            body: sewageRows,
            startY: yPos,
            styles: { fontSize: 10 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
          // For year-by-year results
          const sewageRows = Object.entries(sewageResult).map(([year, value]: [string, unknown]) => {
            // Get population value from computed population
            const popValue = computedPopulation[year] || 0;
            
            if (domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) {
              // For modeled with drains, include drain-based sewage
              const drainSewage = calculateDrainBasedSewFlow(popValue);
              return [
                year, 
                popValue.toLocaleString(), 
                `${Number(value).toFixed(2)} MLD`,
                `${drainSewage.toFixed(2)} MLD`
              ];
            } else {
              // Without drains, just return population and sewage
              return [
                year, 
                popValue.toLocaleString(), 
                `${Number(value).toFixed(2)} MLD`
              ];
            }
          });
          
          // Define table headers based on whether we have drain data
          let headers = ["Year", "Population", "Sewage Generation (MLD)"];
          if (domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) {
            headers.push("Drain-Based Sewage (MLD)");
          }
          
          autoTable(doc, {
            head: [headers],
            body: sewageRows,
            startY: yPos,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [66, 139, 202] },
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text("Sewage generation results not available", 14, yPos);
        yPos += 10;
      }
      
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      // Peak Flow Calculation
      if (peakFlowTable) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("4.4 Peak Flow Calculation Results", 14, yPos);
        yPos += 8;
        
        // Extract peak flow data from the results
        const selectedMethods = Object.entries(peakFlowMethods)
          .filter(([_, selected]) => selected)
          .map(([method]) => method);
        
        // Create headers based on selected methods
        const headers = ["Year", "Population", "Avg Sewage Flow (MLD)"];
        if (selectedMethods.includes('cpheeo')) headers.push("CPHEEO Peak (MLD)");
        if (selectedMethods.includes('harmon')) headers.push("Harmon's Peak (MLD)");
        if (selectedMethods.includes('babbitt')) headers.push("Babbit's Peak (MLD)");
        
        // Create rows for each year
        const peakRows = Object.keys(sewageResult).map((year) => {
          const popVal = computedPopulation[year] || 0;
          const popBasedSewFlow = sewageResult[year] || 0;
          
          // Calculate drain-based sewage flow if needed
          const drainBasedSewFlow = calculateDrainBasedSewFlow(popVal);
          
          // Determine which sewage flow to use based on user selection
          let avgSewFlow;
          if (peakFlowSewageSource === 'drain_based' && 
              domesticLoadMethod === 'modeled' && 
              totalDrainDischarge > 0) {
            avgSewFlow = drainBasedSewFlow;
          } else {
            avgSewFlow = popBasedSewFlow;
          }
          
          const row = [
            year,
            popVal.toLocaleString(),
            avgSewFlow.toFixed(2)
          ];
          
          if (selectedMethods.includes('cpheeo')) {
            row.push((avgSewFlow * getCPHEEOFactor(popVal)).toFixed(2));
          }
          if (selectedMethods.includes('harmon')) {
            row.push((avgSewFlow * getHarmonFactor(popVal)).toFixed(2));
          }
          if (selectedMethods.includes('babbitt')) {
            row.push((avgSewFlow * getBabbittFactor(popVal)).toFixed(2));
          }
          
          return row;
        });
        
        autoTable(doc, {
          head: [headers],
          body: peakRows,
          startY: yPos,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Check if we need a new page for raw sewage characteristics
      if (yPos > 230 && showRawSewage) {
        doc.addPage();
        yPos = 20;
      }
      
      // Raw Sewage Characteristics
      if (showRawSewage) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("4.5 Raw Sewage Characteristics", 14, yPos);
        yPos += 8;
        
        // Calculate base coefficients for the formula
        const basePop = computedPopulation["2011"] || 0;
        const baseCoefficient = basePop >= 1000000 ? 150 : 135;
        const unmetered = Number(unmeteredSupplyInput) || 0;
        const totalCoefficient = (baseCoefficient + unmetered) * 0.80;
        
        // Add coefficients used in calculation
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Base Coefficient: ${baseCoefficient}`, 14, yPos);
        yPos += 5;
        doc.text(`Unmetered Supply: ${unmetered}`, 14, yPos);
        yPos += 5;
        doc.text(`Total Coefficient: ${totalCoefficient.toFixed(2)}`, 14, yPos);
        yPos += 8;
        
        // Create rows for raw sewage table
        const rawRows = pollutionItemsState.map((item) => {
          const concentration = (item.perCapita / totalCoefficient) * 1000;
          return [
            item.name,
            item.perCapita.toFixed(1),
            concentration.toFixed(1),
            (item.designCharacteristic || concentration).toFixed(1)
          ];
        });
        
        autoTable(doc, {
          head: [["Parameter", "Per Capita (g/c/d)", "Concentration (mg/l)", "Design Value (mg/l)"]],
          body: rawRows,
          startY: yPos,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Add References section on a new page
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("5. References", 14, 20);
      yPos = 30;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const references = [
        "1. CPHEEO Manual on Water Supply and Treatment, Ministry of Urban Development, Government of India",
        "2. CPHEEO Manual on Sewerage and Sewage Treatment Systems, Ministry of Urban Development, Government of India",
        "3. Census of India, 2011",
        "4. Guidelines for Decentralized Wastewater Management, Ministry of Environment, Forest and Climate Change",
        "5. IS 1172:1993 - Code of Basic Requirements for Water Supply, Drainage and Sanitation",
        "6. Metcalf & Eddy, Wastewater Engineering: Treatment and Reuse, 4th Edition",
        "7. Fick, S.E., and R.J. Hijmans. 2017. \"WorldClim 2: New 1 km Spatial Surfaces for Global Land Areas.\" International Journal of Climatology 37 (12): 4302–15. https://doi.org/10.1002/joc.5086",
        "8. Harris, I., Osborn, T.J., Jones, P. et al. Version 4 of the CRU TS monthly high-resolution gridded multivariate climate dataset. Scientific Data 7, 109 (2020). https://doi.org/10.1038/s41597-020-0453-3",
        "9. Martens, B., Miralles, D.G., Lievens, H., van der Schalie, R., de Jeu, R.A.M., Fernández-Prieto, D., Beck, H.E., Dorigo, W.A., and Verhoest, N.E.C. 2017. GLEAM v3: satellite-based land evaporation and root-zone soil moisture, Geoscientific Model Development, 10, 1903–1925. https://doi.org/10.5194/gmd-10-1903-2017",
        "10. Miralles, D.G., Holmes, T.R.H., de Jeu, R.A.M., Gash, J.H., Meesters, A.G.C.A., Dolman, A.J. 2011. Global land-surface evaporation estimated from satellite-based observations, Hydrology and Earth System Sciences, 15, 453–469. https://doi.org/10.5194/hess-15-453-2011",
        "11. Save, H., S. Bettadpur, and B.D. Tapley (2016), High resolution CSR GRACE RL05 mascons, Journal of Geophysical Research Solid Earth, 121. https://doi.org/10.1002/2016JB013007",
        "12. Save, H., 2020, CSR GRACE and GRACE-FO RL06 Mascon Solutions v02. https://doi.org/10.1002/essoar.10503394.1"
      ];
      
      // Set up justified text layout for references
      const textOptions = {
        align: 'justify',
        maxWidth: 180 // Width for justified text, adjusted to page margins
      };
      
      // Use splitTextToSize to handle the text wrapping
      references.forEach(ref => {
        const lines = doc.splitTextToSize(ref, textOptions.maxWidth);
        doc.text(lines, 14, yPos, textOptions);
        yPos += (lines.length * 5) + 3; // Adjust spacing based on number of lines
        
        // Add a page if needed
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      // Add notes and footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text("Comprehensive Sewage Generation Report", 14, doc.internal.pageSize.height - 10);
        
        // Add date to each page footer
        doc.text(today, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }
      
      // Save the document
      doc.save("Comprehensive_Sewage_Generation_Report.pdf");
    }
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
        <label className="block text-sm font-medium flex items-center">
              Number Of Drain to be tapped
              <div className="relative ml-1 group">
                <span className="flex items-center justify-center h-4 w-4 text-xs bg-blue-500 text-white rounded-full cursor-help">i</span>
                <div className="absolute z-10 hidden group-hover:block w-64 text-red text-xs rounded p-0 -mt-12 ml-6">
                The number you enter indicates how many drain discharge entries are needed
                </div>
              </div>
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


      <button 
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 ml-300 mb-2 rounded-md transition duration-300 ease-in-out"
        onClick={handle1pdfDownload}
      >
        Download Comprehensive Report
      </button>
      
      
    </div>
  );
};

export default SewageCalculationForm;