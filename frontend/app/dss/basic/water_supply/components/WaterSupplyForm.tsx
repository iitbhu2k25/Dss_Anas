// components/WaterSupplyForm.tsx
'use client';
import React, { useState, useEffect } from 'react';


const WaterSupplyForm: React.FC = () => {
  // Surface Water Supply
  const [surfaceWater, setSurfaceWater] = useState<number | ''>('');

  // Groundwater Supply inputs
  const [directGroundwater, setDirectGroundwater] = useState<number | ''>('');
  const [numTubewells, setNumTubewells] = useState<number | ''>('');
  const [dischargeRate, setDischargeRate] = useState<number | ''>('');
  const [operatingHours, setOperatingHours] = useState<number | ''>('');

  // Alternate Water Supply inputs
  const [directAlternate, setDirectAlternate] = useState<number | ''>('');
  const [rooftopTank, setRooftopTank] = useState<number | ''>('');
  const [aquiferRecharge, setAquiferRecharge] = useState<number | ''>('');
  const [surfaceRunoff, setSurfaceRunoff] = useState<number | ''>('');
  const [reuseWater, setReuseWater] = useState<number | ''>('');

  // Result and error states
  const [waterSupplyResult, setWaterSupplyResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Water Gap calculation - new states
  const [waterGapResult, setWaterGapResult] = useState<{[year: string]: number} | null>(null);
  const [waterDemandData, setWaterDemandData] = useState<{[year: string]: number} | null>(null);

  // Determine if conflicting groundwater inputs are provided
  const isDirectGroundwaterProvided = directGroundwater !== '';
  const areTubeWellInputsProvided =
    numTubewells !== '' || dischargeRate !== '' || operatingHours !== '';

  // Similarly, for alternate supply
  const isDirectAlternateProvided = directAlternate !== '';
  const areAlternateInputsProvided =
    rooftopTank !== '' || aquiferRecharge !== '' || surfaceRunoff !== '' || reuseWater !== '';

  // Function to call the backend API to perform the calculation
  const handleCalculateWaterSupply = async () => {
    setError(null);
    // Check for input conflicts
    if (isDirectGroundwaterProvided && areTubeWellInputsProvided) {
      setError('Error: Provide either direct groundwater supply or tube well inputs, not both.');
      return;
    }
    if (isDirectAlternateProvided && areAlternateInputsProvided) {
      setError('Error: Provide either direct alternate supply or alternate component inputs, not both.');
      return;
    }

    // Build payload from input values
    const payload = {
      surface_water: surfaceWater === '' ? 0 : Number(surfaceWater),
      direct_groundwater: directGroundwater === '' ? 0 : Number(directGroundwater),
      num_tubewells: numTubewells === '' ? 0 : Number(numTubewells),
      discharge_rate: dischargeRate === '' ? 0 : Number(dischargeRate),
      operating_hours: operatingHours === '' ? 0 : Number(operatingHours),
      direct_alternate: directAlternate === '' ? 0 : Number(directAlternate),
      rooftop_tank: rooftopTank === '' ? 0 : Number(rooftopTank),
      aquifer_recharge: aquiferRecharge === '' ? 0 : Number(aquiferRecharge),
      surface_runoff: surfaceRunoff === '' ? 0 : Number(surfaceRunoff),
      reuse_water: reuseWater === '' ? 0 : Number(reuseWater),
    };

    try {
      const response = await fetch('http://localhost:9000/api/basic/water_supply/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Error calculating water supply.');
        return;
      }
      const data = await response.json();
      setWaterSupplyResult(data.total_supply);
      
      // Save globally so that sewage stage can use it
      (window as any).totalWaterSupply = data.total_supply;
      
      // Calculate water gap using the total demand data
      calculateWaterGap(data.total_supply);
    } catch (err) {
      console.error(err);
      setError('Error connecting to backend.');
    }
  };
  
  // Function to calculate water gap
  const calculateWaterGap = (supplyValue: number) => {
    // Get the forecast data (needed for years)
    const forecastData = (window as any).selectedPopulationForecast;
    if (!forecastData) {
      // If no forecast data available, use a default year range
      const defaultYears = ['2020', '2025', '2030', '2035', '2040', '2045', '2050'];
      const defaultDemands = defaultYears.map(() => 0); // Zero demand for all years
      
      // Create water gap with default values
      const gapResult: {[year: string]: number} = {};
      defaultYears.forEach(year => {
        gapResult[year] = supplyValue; // Gap equals supply if demand is zero
      });
      
      setWaterGapResult(gapResult);
      return;
    }
    
    // Try to get existing total demand data 
    // Get the total water demand from WaterDemandForm
    let totalWaterDemand: {[year: string]: number} = {};
    
    // Check if totalWaterDemand is already calculated from WaterDemandForm
    if ((window as any).totalWaterDemand) {
      totalWaterDemand = (window as any).totalWaterDemand;
    } else {
      // Create zero demand for all years
      Object.keys(forecastData).forEach(year => {
        totalWaterDemand[year] = 0;
      });
    }
    
    // Calculate water gap (supply - demand) for each year
    const years = Object.keys(forecastData).sort();
    const gapResult: {[year: string]: number} = {};
    
    years.forEach(year => {
      const demand = totalWaterDemand[year] || 0;
      gapResult[year] = supplyValue - demand;
    });
    
    // Save the total demand data
    setWaterDemandData(totalWaterDemand);
    
    // Save water gap results
    setWaterGapResult(gapResult);
    (window as any).waterGapResult = gapResult;
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-xl font-semibold mb-3">Water Supply Calculation</h3>
      
      {/* Surface Water Supply Section */}
      <div className="mb-4 p-3 border rounded bg-blue-50">
        <h4 className="font-bold text-blue-600">Surface Water Supply (SWS)</h4>
        <div className="mt-2">
          <label className="block text-sm font-medium">
            Surface Water Supply (in MLD):
          </label>
          <input
            type="number"
            value={surfaceWater}
            onChange={(e) =>
              setSurfaceWater(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="mt-1 block w-1/3 border rounded px-2 py-1 bg-white"
            placeholder="Enter MLD"
            min="0"
          />
        </div>
      </div>

      {/* Groundwater Supply Section */}
      <div className="mb-4 p-3 border rounded bg-blue-50">
        <h4 className="font-bold text-blue-600">Groundwater Supply (GWS)</h4>
        <div className="mt-2">
          <label className="block text-sm font-medium">
            Direct Groundwater Supply (in MLD):
          </label>
          <input
            type="number"
            value={directGroundwater}
            onChange={(e) =>
              setDirectGroundwater(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={`mt-1 block w-1/3 border rounded px-2 py-1 ${
              areTubeWellInputsProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
            }`}
            placeholder="Enter MLD"
            min="0"
            disabled={areTubeWellInputsProvided}
          />
        </div>
        <div className="mt-2 text-center text-sm font-medium">OR</div>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">
              Number of Tube-wells:
            </label>
            <input
              type="number"
              value={numTubewells}
              onChange={(e) =>
                setNumTubewells(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectGroundwaterProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter number"
              min="0"
              disabled={isDirectGroundwaterProvided}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Discharge Rate:
            </label>
            <input
              type="number"
              value={dischargeRate}
              onChange={(e) =>
                setDischargeRate(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectGroundwaterProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter rate"
              min="0"
              disabled={isDirectGroundwaterProvided}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Operating Hours:
            </label>
            <input
              type="number"
              value={operatingHours}
              onChange={(e) =>
                setOperatingHours(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectGroundwaterProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter hours"
              min="0"
              disabled={isDirectGroundwaterProvided}
            />
          </div>
        </div>
      </div>

      {/* Alternate Water Supply Section */}
      <div className="mb-4 p-3 border rounded bg-blue-50">
        <h4 className="font-bold text-blue-600">Alternate Water Supply (AWS)</h4>
        <div className="mt-2">
          <label className="block text-sm font-medium">
            Direct Alternate Water Supply (in MLD):
          </label>
          <input
            type="number"
            value={directAlternate}
            onChange={(e) =>
              setDirectAlternate(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={`mt-1 block w-1/3 border rounded px-2 py-1 ${
              areAlternateInputsProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
            }`}
            placeholder="Enter MLD"
            min="0"
            disabled={areAlternateInputsProvided}
          />
        </div>
        <div className="mt-2 text-center text-sm font-medium">OR</div>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">
              Roof-top Harvesting (Rain-tank Storage) (MLD):
            </label>
            <input
              type="number"
              value={rooftopTank}
              onChange={(e) =>
                setRooftopTank(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectAlternateProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter MLD"
              min="0"
              disabled={isDirectAlternateProvided}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Aquifer Recharge (MLD):
            </label>
            <input
              type="number"
              value={aquiferRecharge}
              onChange={(e) =>
                setAquiferRecharge(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectAlternateProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter MLD"
              min="0"
              disabled={isDirectAlternateProvided}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Surface Runoff Storage (MLD):
            </label>
            <input
              type="number"
              value={surfaceRunoff}
              onChange={(e) =>
                setSurfaceRunoff(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectAlternateProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter MLD"
              min="0"
              disabled={isDirectAlternateProvided}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Reuse Potential of Treated Wastewater (MLD):
            </label>
            <input
              type="number"
              value={reuseWater}
              onChange={(e) =>
                setReuseWater(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`mt-1 block w-full border rounded px-2 py-1 ${
                isDirectAlternateProvided ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder="Enter MLD"
              min="0"
              disabled={isDirectAlternateProvided}
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && <div className="mb-4 text-red-500">{error}</div>}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleCalculateWaterSupply}
      >
        Calculate Water Supply
      </button>

      {/* Result display */}
      {waterSupplyResult !== null && (
        <div className="mt-4 p-3 border rounded bg-green-50">
          <h4 className="font-bold text-green-700">Total Water Supply for Selected Region:</h4>
          <p>{waterSupplyResult.toFixed(2)} MLD</p>
        </div>
      )}
      
      {/* Water Gap display - modified section */}
      {waterGapResult !== null && (
        <div className="mt-6">
          <h4 className="font-bold text-blue-700 mb-2">Water Gap Analysis</h4>
          <div className="overflow-x-auto">
            <table className="table-auto w-full min-w-[300px] bg-white border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border px-4 py-2">Year</th>
                  <th className="border px-4 py-2">Water Supply (MLD)</th>
                  <th className="border px-4 py-2">Water Demand (MLD)</th>
                  <th className="border px-4 py-2">Water Gap (MLD)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(waterGapResult).sort().map((year) => {
                  const waterGap = waterGapResult[year];
                  
                  return (
                    <tr key={year}>
                      <td className="border px-4 py-2">{year}</td>
                      <td className="border px-4 py-2">{waterSupplyResult?.toFixed(2)}</td>
                      <td className="border px-4 py-2">{waterDemandData && waterDemandData[year] ? waterDemandData[year].toFixed(2) : "0.00"}</td>
                      <td className="border px-4 py-2">{waterGap.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterSupplyForm;