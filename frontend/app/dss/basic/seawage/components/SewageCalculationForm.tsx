'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type DomesticLoadMethod = 'manual' | 'modeled' | '';
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
  // -----------h
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

  // // --- Initialize Total Water Supply ---
  // useEffect(() => {
  //   if ((window as any).totalWaterSupply) {
  //     setTotalSupplyInput(Number((window as any).totalWaterSupply));
  //   }
  // }, []);

  // --- Initialize and Update Total Water Supply ---
  useEffect(() => {
    if ((window as any).totalWaterSupply !== undefined) {
      // Only set the default value if the input is empty or hasn't been manually changed
      if (totalSupplyInput === '' || totalSupplyInput === (window as any).previousTotalWaterSupply) {
        const newSupply = Number((window as any).totalWaterSupply);
        setTotalSupplyInput(newSupply);
        // Store the value to track if it was set programmatically
        (window as any).previousTotalWaterSupply = newSupply;
      }
    }
  }, [(window as any).totalWaterSupply]);

  // --- Update Drain Items ---
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
  // -------------------------h
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

    // Use domesticSewageResult for modeled method, otherwise use waterSupplyResult or domesticSewageResult
    const sewageResult = domesticLoadMethod === 'modeled' ? domesticSewageResult : (waterSupplyResult || domesticSewageResult);

    const rows = Object.keys(sewageResult || {}).map((year) => {
      const popVal = computedPopulation[year] || 0;
      const popBasedSewFlow = sewageResult[year] || 0;
      const drainBasedSewFlow = calculateDrainBasedSewFlow(popVal);
      const avgSewFlow = peakFlowSewageSource === 'drain_based' && domesticLoadMethod === 'modeled' && totalDrainDischarge > 0
        ? drainBasedSewFlow
        : popBasedSewFlow;

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

    const addLogos = async () => {
      try {
        const iitLogo = new Image();
        iitLogo.crossOrigin = "Anonymous";
        const leftLogoPromise = new Promise((resolve, reject) => {
          iitLogo.onload = resolve;
          iitLogo.onerror = reject;
          iitLogo.src = "/images/export/logo_iitbhu.png";
        });

        const rightLogo = new Image();
        rightLogo.crossOrigin = "Anonymous";
        const rightLogoPromise = new Promise((resolve, reject) => {
          rightLogo.onload = resolve;
          rightLogo.onerror = reject;
          rightLogo.src = "/images/export/right1_slcr.png";
        });

        await Promise.all([leftLogoPromise, rightLogoPromise]);
        doc.addImage(iitLogo, 'PNG', 14, 5, 25, 25);
        const pageWidth = doc.internal.pageSize.width;
        doc.addImage(rightLogo, 'PNG', pageWidth - 39, 5, 25, 25);
      } catch (err) {
        console.error("Failed to load logos:", err);
      }
    };

    function continueWithReport() {
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.text("Comprehensive Report of Sewage Generation", doc.internal.pageSize.width / 2, 20, { align: 'center' });
      const today = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      let yPos = 40;

      // 1. Population Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("1. Population Analysis", 14, yPos);
      yPos += 8;

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

          if (locationData.villages && locationData.villages.length > 0) {
            const villagesText = Array.isArray(locationData.villages)
              ? `Villages: ${locationData.villages.join(', ')}`
              : `Villages: ${locationData.villages.toString()}`;
            const villageLines = doc.splitTextToSize(villagesText, 180);
            doc.text(villageLines, 14, yPos);
            yPos += (villageLines.length * 5);

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

          const populationData = (window as any).selectedPopulationForecast || {};
          if (Object.keys(populationData).length > 0) {
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

      // 2. Water Demand Section
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
          doc.text("Water demand is estimated based on various contributingcontributing factors including domestic, floating, commercial, institutional, and firefighting demands as per CPHEEO manual guidelines.", 14, yPos);
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

      // 3. Water Supply Section
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
          doc.text(`The estimated total water supply is: ${waterSupply.toFixed(2)} MLD`, 14, yPos);
          yPos += 10;
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("3.1 Water Supply Details", 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text("Total Water Supply:", 14, yPos);
          doc.text(`${totalSupplyInput} MLD`, 80, yPos);
          yPos += 5;

          if (unmeteredSupplyInput) {
            doc.text("Unmetered Water Supply:", 14, yPos);
            doc.text(`${unmeteredSupplyInput} MLD`, 80, yPos);
            yPos += 5;
          }

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

      // 4. Sewage Generation Section
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("4. Sewage Generation Analysis", 14, yPos);
      yPos += 8;

      // 4.1 Water Supply Method
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.1 Water Supply Method", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Sewage Calculation Method: Water Supply", 14, yPos);
      yPos += 5;
      doc.text("Total Water Supply:", 14, yPos);
      doc.text(`${totalSupplyInput} MLD`, 80, yPos);
      yPos += 10;

      if (waterSupplyResult) {
        if (typeof waterSupplyResult === 'number') {
          const sewageRows = [["Sewage Generation", `${waterSupplyResult.toFixed(2)} MLD`]];
          autoTable(doc, {
            body: sewageRows,
            startY: yPos,
            styles: { fontSize: 10 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
          const sewageRows = Object.entries(waterSupplyResult).map(([year, value]: [string, unknown]) => [
            year,
            computedPopulation[year]?.toLocaleString() || '0',
            `${Number(value).toFixed(2)} MLD`
          ]);
          autoTable(doc, {
            head: [["Year", "Population", "Sewage Generation (MLD)"]],
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
        doc.text("Water supply method results not available", 14, yPos);
        yPos += 10;
      }

      // 4.2 Domestic Sewage Load Estimation
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.2 Domestic Sewage Load Estimation", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Sewage Calculation Method: Domestic Sewage Load Estimation", 14, yPos);
      yPos += 5;
      doc.text("Domestic Load Method:", 14, yPos);
      doc.text(domesticLoadMethod === 'manual' ? "Manual Input" : "Population-based Modeling", 80, yPos);
      yPos += 5;

      if (domesticLoadMethod === 'manual') {
        doc.text("Domestic Water Supply:", 14, yPos);
        doc.text(`${domesticSupplyInput} MLD`, 80, yPos);
        yPos += 5;
      }

      yPos += 5;

      if (domesticSewageResult) {
        if (typeof domesticSewageResult === 'number') {
          const sewageRows = [["Sewage Generation", `${domesticSewageResult.toFixed(2)} MLD`]];
          autoTable(doc, {
            body: sewageRows,
            startY: yPos,
            styles: { fontSize: 10 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
          const sewageRows = Object.entries(domesticSewageResult).map(([year, value]: [string, unknown]) => {
            const popValue = computedPopulation[year] || 0;
            const waterSewage = calculatewaterBasedSewFlow(popValue);
            if (domesticLoadMethod === 'modeled' && totalDrainDischarge > 0) {
              const drainSewage = calculateDrainBasedSewFlow(popValue);
              return [
                year,
                popValue.toLocaleString(),
                `${Number(value).toFixed(2)} MLD`,
                waterSewage > 0 ? `${waterSewage.toFixed(2)} MLD` : '0.00 MLD',
                `${drainSewage.toFixed(2)} MLD`
              ];
            }
            return [
              year,
              popValue.toLocaleString(),
              `${Number(value).toFixed(2)} MLD`,
              waterSewage > 0 ? `${waterSewage.toFixed(2)} MLD` : '0.00 MLD'
            ];
          });
          let headers = ["Year", "Population", "Sewage Generation (MLD)"];
          if ((window as any).totalWaterSupply > 0) {
            headers.push("Water Based Sewage (MLD)");
          }
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
        doc.text("Domestic sewage method results not available", 14, yPos);
        yPos += 10;
      }

      // 4.3 Drain Information
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4.3 Drain Information", 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Number of Drains to be Tapped:", 14, yPos);
      doc.text(`${drainCount}`, 80, yPos);
      yPos += 5;
      doc.text("Total Drain Discharge:", 14, yPos);
      doc.text(`${totalDrainDischarge.toFixed(2)} MLD`, 80, yPos);
      yPos += 10;

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
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // 4.4 Peak Flow Calculation
      if (peakFlowTable && yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      if (peakFlowTable) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("4.4 Peak Flow Calculation Results", 14, yPos);
        yPos += 8;
        const selectedMethods = Object.entries(peakFlowMethods)
          .filter(([_, selected]) => selected)
          .map(([method]) => method);
        const headers = ["Year", "Population", "Avg Sewage Flow (MLD)"];
        if (selectedMethods.includes('cpheeo')) headers.push("CPHEEO Peak (MLD)");
        if (selectedMethods.includes('harmon')) headers.push("Harmon's Peak (MLD)");
        if (selectedMethods.includes('babbitt')) headers.push("Babbit's Peak (MLD)");

        const sewageResult = domesticLoadMethod === 'modeled' ? domesticSewageResult : (waterSupplyResult || domesticSewageResult);
        const peakRows = Object.keys(sewageResult || {}).map((year) => {
          const popVal = computedPopulation[year] || 0;
          const popBasedSewFlow = sewageResult[year] || 0;
          const drainBasedSewFlow = calculateDrainBasedSewFlow(popVal);
          const avgSewFlow = peakFlowSewageSource === 'drain_based' && domesticLoadMethod === 'modeled' && totalDrainDischarge > 0
            ? drainBasedSewFlow
            : popBasedSewFlow;
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

      // 4.5 Raw Sewage Characteristics
      if (showRawSewage && yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      if (showRawSewage) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("4.5 Raw Sewage Characteristics", 14, yPos);
        yPos += 8;
        const basePop = computedPopulation["2011"] || 0;
        const baseCoefficient = basePop >= 1000000 ? 150 : 135;
        const unmetered = Number(unmeteredSupplyInput) || 0;
        const totalCoefficient = (baseCoefficient + unmetered) * 0.80;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Base Coefficient: ${baseCoefficient}`, 14, yPos);
        yPos += 5;
        doc.text(`Unmetered Supply: ${unmetered}`, 14, yPos);
        yPos += 5;
        doc.text(`Total Coefficient: ${totalCoefficient.toFixed(2)}`, 14, yPos);
        yPos += 8;
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

      // 5. References
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
      const textOptions = { align: 'justify', maxWidth: 180 };
      references.forEach(ref => {
        const lines = doc.splitTextToSize(ref, textOptions.maxWidth);
        doc.text(lines, 14, yPos, textOptions);
        yPos += (lines.length * 5) + 3;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text("Comprehensive Sewage Generation Report", 14, doc.internal.pageSize.height - 10);
        doc.text(today, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save("Comprehensive_Sewage_Generation_Report.pdf");
    }

    addLogos().then(continueWithReport).catch(err => {
      console.error("Error adding logos:", err);
      continueWithReport();
    });
  };

    // --- Handler for Checkbox Changes ---
  const handleCheckboxChange = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };


  return (
    <div className="p-4 border rounded bg-white space-y-8">
      <h3 className="text-xl font-semibold mb-3">Sewage Calculation</h3>

      {/* Water Supply Method Container */}
      <div className="p-4 border rounded bg-gray-50">
        <h4 className="text-lg font-semibold mb-3">Water Supply Method</h4>
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
        {waterSupplyResult && (
          <div className="mt-4 p-3 border rounded bg-green-50">
            <h4 className="font-bold text-green-700">Sewage Generation (Water Supply):</h4>
            {typeof waterSupplyResult === 'number' ? (
              <p>{waterSupplyResult.toFixed(2)} MLD</p>
            ) : (
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Year</th>
                    <th className="border px-4 py-2">Forecasted Population</th>
                    <th className="border px-2 py-1">Sewage Generation (MLD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(waterSupplyResult).map(([year, value]) => (
                    <tr key={year}>
                      <td className="border px-2 py-1">{year}</td>
                      <td className="border px-4 py-2">{computedPopulation[year]?.toLocaleString() || '0'}</td>
                      <td className="border px-2 py-1">{Number(value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Drain Tapping Input */}
      <div className="mb-4 p-3 border rounded bg-gray-50">
        <h4 className="font-bold text-gray-700 mb-2">Drain Tapping Information</h4>
        <label className="block text-sm font-medium flex items-center">
          Number Of Drains to be Tapped
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

      {/* Domestic Sewage Load Estimation Container */}
      <div className="p-4 border rounded bg-gray-50">
        <h4 className="text-lg font-semibold mb-3">Domestic Sewage Load Estimation</h4>
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
        {domesticSewageResult && (
          <div className="mt-4 p-3 border rounded bg-green-50">
            <h4 className="font-bold text-green-700">Sewage Generation (Domestic):</h4>
            {typeof domesticSewageResult === 'number' ? (
              <p>{domesticSewageResult.toFixed(2)} MLD</p>
            ) : (
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Year</th>
                    <th className="border px-4 py-2">Forecasted Population</th>
                    {(window as any).totalWaterSupply > 0 && (
                      <th className="border px-2 py-1">Water Based Sewage Generation (MLD)</th>
                    )}
                    <th className="border px-2 py-1">Population Based Sewage Generation (MLD)</th>
                    {domesticLoadMethod === 'modeled' && totalDrainDischarge > 0 && (
                      <th className="border px-2 py-1">Drains Based Sewage Generation (MLD)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domesticSewageResult).map(([year, value]) => {
                    const forecastData = (window as any).selectedPopulationForecast;
                    const domesticPop = forecastData[year] ?? "";
                    const drainsSewage = calculateDrainBasedSewFlow(domesticPop);
                    const waterSewage = calculatewaterBasedSewFlow(domesticPop);
                    return (
                      <tr key={year}>
                        <td className="border px-2 py-1">{year}</td>
                        <td className="border px-4 py-2">{domesticPop.toLocaleString()}</td>
                        {(window as any).totalWaterSupply > 0 && (
                          <td className="border px-2 py-1">{waterSewage > 0 ? waterSewage.toFixed(6) : "0.000000"}</td>
                        )}
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
      </div>



      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleCalculateSewage}
      >
        Calculate Sewage
      </button>
      {error && <div className="mt-4 text-red-500">{error}</div>}

      {showPeakFlow && (
        <div className="mt-6 p-4 border rounded bg-blue-50">
          <h5 className="font-bold text-blue-700 mb-3">Peak Sewage Flow Calculation</h5>
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

      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h5 className="font-bold text-gray-700 mb-3">Report Checklist</h5>
        <p className="text-sm text-gray-600 mb-4">
          Please confirm completion of the following sections to enable the comprehensive report download.
        </p>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkboxes.populationForecasting}
              onChange={() => handleCheckboxChange('populationForecasting')}
              className="mr-2"
            />
            Population Forecasting
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkboxes.waterDemand}
              onChange={() => handleCheckboxChange('waterDemand')}
              className="mr-2"
            />
            Water Demand
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkboxes.waterSupply}
              onChange={() => handleCheckboxChange('waterSupply')}
              className="mr-2"
            />
            Water Supply
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkboxes.sewageCalculation}
              onChange={() => handleCheckboxChange('sewageCalculation')}
              className="mr-2"
            />
            Sewage Calculation
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkboxes.rawSewageCharacteristics}
              onChange={() => handleCheckboxChange('rawSewageCharacteristics')}
              className="mr-2"
            />
            Raw Sewage Characteristics
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className={`text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md w-full sm:w-auto ${
            areAllCheckboxesChecked
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