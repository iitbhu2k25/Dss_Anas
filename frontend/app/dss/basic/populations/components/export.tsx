'use client';
import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from 'date-fns';
import Population from '../population';
import SewageCalculationForm from '../../seawage/components/SewageCalculationForm';
import WaterDemandForm from '../../water_demand/components/WaterDemandForm';
import WaterSupplyForm from '../../water_supply/components/WaterSupplyForm';  
import PopulationChart from './PopulationChart'; 

 

// Define interfaces for all the data types we need to access
interface ExportProps {
  projectName?: string;
}

interface LocationData {
  state: string;
  districts: string[];
  subDistricts: string[];
  villages: string[];
  allVillages?: Array<{
    name: string;
    population: number;
    subDistrict: string;
    district: string;
  }>;
  totalPopulation: number;
}

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

const ExportReport: React.FC<ExportProps> = ({ projectName = "Comprehensive Report on Sewage Generation" }) => {
  // Ensure the project name is set correctly regardless of what is passed
  const reportTitle = "Comprehensive Report on Sewage Generation";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate PDF report with all component data
  const generatePDF = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Create new PDF document
      const doc = new jsPDF();
      let yPos = 60;

      // Get data from window objects
      const populationData = (window as any).selectedPopulationForecast || {};
      const selectedMethod = (window as any).selectedMethod || '';
      const population2025 = (window as any).population2025 || 0;
      const waterDemandData = (window as any).totalWaterDemand || {};
      const waterSupply = (window as any).totalWaterSupply || 0;

      // Get location data from window object
      const locationData: LocationData = (window as any).selectedLocations || {
        state: '',
        districts: [],
        subDistricts: [],
        villages: [],
        totalPopulation: 0
      };

      console.log("Location data for PDF:", locationData); // Debug

      // Global text size settings - smaller base font
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8); // Smaller base font size

      // Layout spacing adjustment
      const lineSpacing = 5; // Reduced from default

      // Define consistent table settings
      const tableSettings = {
        startX: 20,
        tableWidth: 170,
        margin: { left: 20 },
        headStyles: {
          fillColor: [0, 101, 163],
          fontSize: 7,
          cellPadding: 1
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1
        }
      };

      // Define consistent text settings for regular content
      const textSettings = {
        sectionTitle: {
          font: "helvetica",
          style: "bold",
          size: 12,
          color: [0, 75, 150],
          spacing: 8
        },
        subsectionTitle: {
          font: "helvetica",
          style: "bold",
          size: 10,
          color: [0, 0, 0],
          spacing: 6
        },
        normalText: {
          font: "helvetica",
          style: "normal",
          size: 8,
          color: [0, 0, 0],
          spacing: 6
        },
        italicText: {
          font: "helvetica",
          style: "italic",
          size: 8,
          color: [0, 0, 0],
          spacing: 6
        },
        boldText: {
          font: "helvetica",
          style: "bold",
          size: 8,
          color: [0, 0, 0],
          spacing: 6
        }
      };

      // Helper function to apply text settings and return new Y position
      const applyTextSettings = (settings, text, x, y, options = {}) => {
        doc.setFont(settings.font, settings.style);
        doc.setFontSize(settings.size);
        doc.setTextColor(...settings.color);
        
        // If the text is an array, render each line
        if (Array.isArray(text)) {
          text.forEach((line, index) => {
            doc.text(line, x, y + (index * settings.spacing), options);
          });
          return y + (text.length * settings.spacing);
        } else {
          // For single line text
          const lines = doc.splitTextToSize(text, options.maxWidth || 170);
          doc.text(lines, x, y, options);
          return y + (lines.length * settings.spacing);
        }
      };

      // ---- GEOGRAPHIC LOCATION SECTION ----
      yPos = applyTextSettings(
        textSettings.sectionTitle, 
        "GEOGRAPHIC LOCATION", 
        20, 
        yPos
      );

      // Add state information
      if (locationData.state) {
        yPos = applyTextSettings(
          textSettings.normalText,
          `State: ${locationData.state}`,
          20,
          yPos
        );
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "State: Not specified",
          20,
          yPos
        );
      }

      // Add districts information with consistent formatting
      if (locationData.districts && locationData.districts.length > 0) {
        const districtsText = Array.isArray(locationData.districts)
          ? `Districts: ${locationData.districts.join(', ')}`
          : `Districts: ${locationData.districts.toString()}`;

        yPos = applyTextSettings(
          textSettings.normalText,
          districtsText,
          20,
          yPos,
          { maxWidth: 170 }
        );
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "Districts: Not specified",
          20,
          yPos
        );
      }

      // Add subdistricts information with consistent formatting
      if (locationData.subDistricts && locationData.subDistricts.length > 0) {
        const subDistrictsText = Array.isArray(locationData.subDistricts)
          ? `Sub-Districts: ${locationData.subDistricts.join(', ')}`
          : `Sub-Districts: ${locationData.subDistricts.toString()}`;

        yPos = applyTextSettings(
          textSettings.normalText,
          subDistrictsText,
          20,
          yPos,
          { maxWidth: 170 }
        );
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "Sub-Districts: Not specified",
          20,
          yPos
        );
      }

      // Add villages information with consistent formatting
      if (locationData.villages && locationData.villages.length > 0) {
        const villagesText = Array.isArray(locationData.villages)
          ? `Villages: ${locationData.villages.join(', ')}`
          : `Villages: ${locationData.villages.toString()}`;

        yPos = applyTextSettings(
          textSettings.normalText,
          villagesText,
          20,
          yPos,
          { maxWidth: 170 }
        );
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "Villages: Not specified",
          20,
          yPos
        );
      }

      // Add villages table with population if available - more compact
      if (locationData.allVillages && locationData.allVillages.length > 0) {
        yPos = applyTextSettings(
          textSettings.boldText,
          "Selected Villages with Population:",
          20,
          yPos
        );

        // Create table data
        const villageRows = locationData.allVillages.map(village => [
          village.name,
          village.subDistrict,
          village.district,
          village.population.toLocaleString()
        ]);

        // Add table with villages data - using consistent table width
        autoTable(doc, {
          head: [['Village Name', 'Sub-District', 'District', 'Population (2011)']],
          body: villageRows,
          startY: yPos,
          margin: tableSettings.margin,
          headStyles: tableSettings.headStyles,
          bodyStyles: tableSettings.bodyStyles,
          // Use consistent column widths that sum to tableWidth
          columnStyles: {
            0: { cellWidth: 42.5 },
            1: { cellWidth: 42.5 },
            2: { cellWidth: 42.5 },
            3: { cellWidth: 42.5, halign: 'right' }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
      }

      // Add total population information
      if (locationData.totalPopulation) {
        yPos = applyTextSettings(
          textSettings.boldText,
          `Total Population (2011): ${locationData.totalPopulation.toLocaleString()}`,
          20,
          yPos
        );
      } else {
        yPos = applyTextSettings(
          textSettings.boldText,
          "Total Population (2011): Not available",
          20,
          yPos
        );
      }

      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      // 1. POPULATION SECTION
      yPos = applyTextSettings(
        textSettings.sectionTitle,
        "1. POPULATION FORECAST",
        20,
        yPos
      );

      // Add the text about Table 1 and Figure 6 with proper formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        `Table is showing the population from initial year to target year for the selected regions based on the ${selectedMethod}. The population growth trend for the selected regions is shown in the Figure below.`,
        20,
        yPos,
        { maxWidth: 170 }
      );

      // Population method with consistent formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        `Selected Population Projection Method: ${selectedMethod}`,
        20,
        yPos
      );

      // Population forecast table - HORIZONTAL LAYOUT with consistent width
      const populationYears = Object.keys(populationData).sort();
      if (populationYears.length > 0) {
        // Create horizontal table - years as columns, only two rows (headers and values)
        const yearRow = populationYears;
        const populationRow = populationYears.map(year =>
          Math.round(populationData[year]).toLocaleString()
        );

        // Use consistent table width
        const tableWidth = tableSettings.tableWidth;
        const tableX = tableSettings.startX;
        const tableY = yPos;
        const cellWidth = tableWidth / yearRow.length;

        // Draw header row with background
        doc.setFillColor(0, 101, 163);
        doc.rect(tableX, tableY, tableWidth, 8, 'F');

        // Draw header text (years)
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);

        yearRow.forEach((year, index) => {
          const x = tableX + (index * cellWidth) + (cellWidth / 2);
          doc.text(year, x, tableY + 5, { align: 'center' });
        });

        // Draw data row
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        doc.rect(tableX, tableY + 8, tableWidth, 8, 'F');

        populationRow.forEach((pop, index) => {
          const x = tableX + (index * cellWidth) + (cellWidth / 2);
          doc.text(pop, x, tableY + 13, { align: 'center' });
        });

        // Draw grid lines
        doc.setDrawColor(200, 200, 200);

        // Vertical lines
        for (let i = 0; i <= yearRow.length; i++) {
          const x = tableX + (i * cellWidth);
          doc.line(x, tableY, x, tableY + 16);
        }

        // Horizontal lines
        doc.line(tableX, tableY, tableX + tableWidth, tableY);
        doc.line(tableX, tableY + 8, tableX + tableWidth, tableY + 8);
        doc.line(tableX, tableY + 16, tableX + tableWidth, tableY + 16);

        yPos = tableY + 22; // Move down after the table
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "No population forecast data available.",
          20,
          yPos
        );
      }

      // 2. WATER DEMAND SECTION
      yPos = applyTextSettings(
        textSettings.sectionTitle,
        "2. WATER DEMAND ANALYSIS",
        20,
        yPos
      );

      // Description paragraph with consistent formatting
      yPos = applyTextSettings(
        textSettings.italicText,
        "Water demand is estimated based on various contributing factors, categorized into the following components:",
        20,
        yPos,
        { maxWidth: 170 }
      );

      // Domestic Demand - formatted with consistent alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Domestic Demand:",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Represents the water consumption for household and residential purposes, including drinking, cooking, bathing, and sanitation.",
        50,
        yPos - textSettings.normalText.spacing, // Adjust to align with the bold text
        { maxWidth: 140 }
      );

      // Floating Demand - formatted with consistent alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Floating Demand:",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Accounts for the transient population such as commuters, tourists, and workers who do not reside in the region but contribute to water consumption. Floating population data is not as such available on the census website. So, in that regard, migrants based on their residence period of less than 1 year under the categories of education, business, work/employment, and others have been selected for the floating population category.",
        50,
        yPos - textSettings.normalText.spacing, // Adjust to align with the bold text
        { maxWidth: 140 }
      );

      // Fire Fighting Demand - formatted with consistent alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Fire Fighting Demand:",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Refers to the estimated water requirement for fire protection services, ensuring adequate supply in case of emergencies.",
        50,
        yPos - textSettings.normalText.spacing, // Adjust to align with the bold text
        { maxWidth: 140 }
      );

      // Total Demand - formatted with consistent alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Total Demand:",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Represents the cumulative water requirement, incorporating domestic, floating, firefighting, and any other relevant demand factors.",
        50,
        yPos - textSettings.normalText.spacing, // Adjust to align with the bold text
        { maxWidth: 140 }
      );

      // CPHEEO note with consistent formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        "CPHEEO manual was used to find out the water demand under the selected category.",
        20,
        yPos + 2, // Small additional spacing after the last section
        { maxWidth: 170 }
      );

      // Final demand statement with consistent formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        "For the selected region, the estimated water demand under the selected category is __MLD__ (Million Liters per Day), as indicated in the table below. This estimate is derived from projected population figures, per capita water consumption standards, and other relevant influencing factors, ensuring a comprehensive and accurate assessment of water demand.",
        20,
        yPos,
        { maxWidth: 170 }
      );

      // Continue with the existing water demand table code
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
          margin: tableSettings.margin,
          headStyles: tableSettings.headStyles,
          bodyStyles: tableSettings.bodyStyles,
          // Add consistent column widths
          columnStyles: {
            0: { cellWidth: 56.6 },
            1: { cellWidth: 56.7 },
            2: { cellWidth: 56.7 }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "No water demand data available.",
          20,
          yPos
        );
      }

      // 3. WATER SUPPLY SECTION
      yPos = applyTextSettings(
        textSettings.sectionTitle,
        "3. WATER SUPPLY ANALYSIS",
        20,
        yPos
      );

      // Add the text about water supply estimation with consistent formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        "Water supply plays a critical role in determining sewage generation within a region. The total water supplied directly influences wastewater production, which must be effectively managed through sewage treatment systems.",
        20,
        yPos,
        { maxWidth: 170 }
      );

      // Water Supply Estimation subsection title
      yPos = applyTextSettings(
        textSettings.boldText,
        "Water Supply Estimation",
        20,
        yPos
      );

      // Italicized intro text
      yPos = applyTextSettings(
        textSettings.italicText,
        "The water supply for the selected region is assessed based on multiple sources, including:",
        20,
        yPos,
        { maxWidth: 170 }
      );

      // Surface Water Supply - formatted for alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Surface Water Supply (SWS):",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Water obtained from rivers, lakes, reservoirs, or canals.",
        70,
        yPos - textSettings.normalText.spacing, // Adjust to align
        { maxWidth: 80 }
      );

      // Groundwater Supply - formatted for alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Groundwater Supply (GWS):",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Water sourced from wells, tube wells, and borewells.",
        70,
        yPos - textSettings.normalText.spacing, // Adjust to align
        { maxWidth: 80 }
      );

      // Alternate Water Supply - formatted for alignment
      yPos = applyTextSettings(
        textSettings.boldText,
        "Alternate Water Supply (AWS):",
        20,
        yPos
      );
      
      yPos = applyTextSettings(
        textSettings.normalText,
        "Includes desalination plants, rainwater harvesting, and wastewater recycling.",
        70,
        yPos - textSettings.normalText.spacing, // Adjust to align
        { maxWidth: 80 }
      );

      

      // Continue with existing water supply information
      if (waterSupply > 0) {
        yPos = applyTextSettings(
          textSettings.normalText,
          `The estimated total water supply is: ${waterSupply.toFixed(2)} MLD (Million Liters per Day)`,
          20,
          yPos
        );

        // Water Gap Analysis
        if (waterDemandYears.length > 0) {
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

          yPos = applyTextSettings(
            textSettings.subsectionTitle,
            "Water Gap Analysis",
            20,
            yPos
          );

          autoTable(doc, {
            head: [['Year', 'Supply (MLD)', 'Demand (MLD)', 'Gap (MLD)', 'Status']],
            body: waterGapRows,
            startY: yPos,
            margin: tableSettings.margin,
            headStyles: tableSettings.headStyles,
            bodyStyles: tableSettings.bodyStyles,
            // Add consistent column widths
            columnStyles: {
              0: { cellWidth: 34 },
              1: { cellWidth: 34 },
              2: { cellWidth: 34 },
              3: { cellWidth: 34 },
              4: { cellWidth: 34 }
            }
          });

          yPos = (doc as any).lastAutoTable.finalY + 6;
        }
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "No water supply data available.",
          20,
          yPos
        );
      }

      // Check if need to add a new page for sewage section
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      // 4. SEWAGE SECTION
      yPos = applyTextSettings(
        textSettings.sectionTitle,
        "4. SEWAGE GENERATION & PEAK FLOW",
        20,
        yPos
      );

      // Add the text about sewage computation with consistent formatting
      yPos = applyTextSettings(
        textSettings.normalText,
        "Sewage is computed based on the domestic water consumption pattern. CPHEEO manual highlights that 80% of the domestic water consumption is directly converted to the sewerage, and 5% of the generated sewerage is infiltrated. Non-Revenue Water (NRW) has a significant share in the sewerage generation, and it's a critical factor for the dilution of raw sewerage. Raw sewerage characteristics was computed based on the CPHEEO manual",
        20,
        yPos,
        { maxWidth: 170 }
      );
      
      

      // Format the complex paragraph with mixed styles more consistently
      // First part - normal text
      yPos = applyTextSettings(
        textSettings.normalText,
        "Report highlighted that sewage generated for the selected region is",
        20,
        yPos,
        { maxWidth: 170 }
      );
      
     
      // Get sewage data if available
      const sewageData = (window as any).selectedPopulationForecast2025 || null;

      if (sewageData) {
        yPos = applyTextSettings(
          textSettings.normalText,
          `Design Population (2025): ${Math.round(population2025).toLocaleString()}`,
          20,
          yPos
        );
        
        yPos = applyTextSettings(
          textSettings.normalText,
          `Estimated Sewage Generation (2025): ${sewageData.toFixed(2)} MLD`,
          20,
          yPos - 2 // Reduce spacing slightly for these related items
        );

        // Peak factors heading with consistent formatting
        yPos = applyTextSettings(
          textSettings.subsectionTitle,
          "Peak Flow Factors",
          20,
          yPos
        );

        const popValue = population2025 || 0;
        const cpheeoFactor = popValue < 20000 ? 3.0 : popValue <= 50000 ? 2.5 : popValue <= 75000 ? 2.25 : 2.0;
        const harmonFactor = 1 + 14 / (4 + Math.sqrt(popValue / 1000));
        const babbittFactor = 5 / Math.pow(popValue / 1000, 0.2);

        autoTable(doc, {
          head: [['Method', 'Peak Factor', 'Peak Flow (MLD)']],
          body: [
            ['CPHEEO', cpheeoFactor.toFixed(2), (sewageData * cpheeoFactor).toFixed(2)],
            ['Harmon', harmonFactor.toFixed(2), (sewageData * harmonFactor).toFixed(2)],
            ['Babbitt', babbittFactor.toFixed(2), (sewageData * babbittFactor).toFixed(2)]
          ],
          startY: yPos,
          margin: tableSettings.margin,
          headStyles: tableSettings.headStyles,
          bodyStyles: tableSettings.bodyStyles,
          // Add consistent column widths
          columnStyles: {
            0: { cellWidth: 56.6 },
            1: { cellWidth: 56.7 },
            2: { cellWidth: 56.7 }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;

        // Sewage Characteristics
        const basePop = populationData["2011"] || 0;
        const baseCoefficient = basePop >= 1000000 ? 150 : 135;
        const totalCoefficient = baseCoefficient * 0.80;

        yPos = applyTextSettings(
          textSettings.subsectionTitle,
          "Raw Sewage Characteristics",
          20,
          yPos
        );

        const pollutionItems = [
          { name: "BOD", perCapita: 27.0 },
          { name: "COD", perCapita: 45.9 },
          { name: "TSS", perCapita: 40.5 },
          { name: "Total Nitrogen", perCapita: 5.4 },
          { name: "Total Phosphorus", perCapita: 0.8 }
        ];

        const pollutionRows = pollutionItems.map(item => {
          const concentration = (item.perCapita / totalCoefficient) * 1000;
          return [
            item.name,
            item.perCapita.toFixed(1),
            concentration.toFixed(1)
          ];
        });

        autoTable(doc, {
          head: [['Parameter', 'Per Capita (g/c/d)', 'Concentration (mg/l)']],
          body: pollutionRows,
          startY: yPos,
          margin: tableSettings.margin,
          headStyles: tableSettings.headStyles,
          bodyStyles: tableSettings.bodyStyles,
          // Add consistent column widths
          columnStyles: {
            0: { cellWidth: 56.6 },
            1: { cellWidth: 56.7 },
            2: { cellWidth: 56.7 }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
      } else {
        yPos = applyTextSettings(
          textSettings.normalText,
          "No sewage analysis data available.",
          20,
          yPos
        );
      }

      // Add references section - check if we need a new page
      if (yPos > 230) {
        doc.addPage();
        yPos = 50;
      }

      // 5. REFERENCES SECTION
      yPos = applyTextSettings(
        textSettings.sectionTitle,
        "5. REFERENCES",
        20,
        yPos
      );

      // Define references with consistent formatting
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

      // Check if we need to add another page for all references
      if (yPos + (references.length * 6) > 280) {
        doc.addPage();
        yPos = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12); // Reduced from 14
        doc.setTextColor(0, 75, 150);
        doc.text("5. REFERENCES (CONTINUED)", 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8; // Reduced from 10

        doc.setFontSize(7); // Reduced from 10
        doc.setFont("helvetica", "normal");
      }

      references.forEach(ref => {
        // If reference will go off page, add a new page
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }

        // Split long references to fit on page width
        const refLines = doc.splitTextToSize(ref, 170);
        doc.text(refLines, 20, yPos);
        yPos += (refLines.length * 4); // Reduced from 6
      });

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); // Reduced from 10
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
      }

      // Handle logo loading asynchronously only for the first page
      const loadFirstPageLogos = async () => {
        // Only add logos to the first page
        doc.setPage(1);

        // Load the left logo (IIT BHU)
        try {
          const iitLogo = new Image();
          iitLogo.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            iitLogo.onload = resolve;
            iitLogo.onerror = reject;
            iitLogo.src = "/images/export/logo_iitbhu.png"; // Path in public folder
          });
          doc.addImage(iitLogo, 'PNG', 10, 10, 30, 30);
        } catch (err) {
          console.error("Failed to load IIT BHU logo:", err);
        }

        // Load the right logo (SLCR) - only load one
        try {
          const slcrLogo = new Image();
          slcrLogo.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            slcrLogo.onload = resolve;
            slcrLogo.onerror = reject;
            slcrLogo.src = "/images/export/right1_slcr.png"; // Path in public folder - fixed path
          });
          doc.addImage(slcrLogo, 'PNG', 170, 10, 30, 30);
        } catch (err) {
          console.error("Failed to load SLCR logo:", err);
        }

        // Add title and header after logos
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(reportTitle, 105, 25, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const dateTime = format(new Date(), 'PPpp');


        doc.text(
          `This report was created with the Decision Support System Web App, IIT BHU on ${dateTime}. ` +
          `Please save this page or take a print to PDF, as it will not be saved on the server.`,
          105,
          45,
          { align: "center", maxWidth: 180 } // maxWidth to keep the text within the page
        );


        // Save the PDF after images are loaded (or attempts failed)
        doc.save("Comprehensive_Report_on_Sewage_Generation.pdf");
      };

      // Execute the image loading and PDF saving
      await loadFirstPageLogos();

    } catch (err) {
      console.error("Error generating PDF report:", err);
      setError("Failed to generate PDF report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 border border-blue-600 rounded-lg bg-white mt-4 mr-24 ml-4 shadow-md">
      <h2 className="text-xl font-semibold mb-4 ">Generate Comprehensive Report</h2>
      <div className="mb-6">
        <p className="text-gray-600 mb-3">
          Generate a comprehensive PDF report that includes all analysis from:
        </p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          <li>Geographic Location</li>
          <li>Population Forecast</li>
          <li>Water Demand Analysis</li>
          <li>Water Supply Assessment</li>
          <li>Sewage Generation & Characteristics</li>
          <li>References</li>
        </ul>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={generatePDF}
          disabled={generating}
          className={`px-4 py-2 rounded-md text-white font-medium flex items-center space-x-2 ${generating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {generating ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate PDF Report</span>
            </>
          )}
        </button>
        
      </div>

      

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 text-blue-700 rounded-md">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium mb-1">Note:</p>
            <p className="text-sm">
              The report will include all calculations performed in previous steps.
              Make sure you have completed the necessary calculations before generating the report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReport;