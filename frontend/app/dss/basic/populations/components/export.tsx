'use client';
import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from 'date-fns';

// Define interfaces for all the data types we need to access
interface ExportProps {
  projectName?: string;
}

const ExportReport: React.FC<ExportProps> = ({ projectName = "Water & Sewage Analysis Report" }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate PDF report with all component data
  const generatePDF = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Create new PDF document
      const doc = new jsPDF();
      let yPos = 20;
      
      // Get data from window objects
      const populationData = (window as any).selectedPopulationForecast || {};
      const selectedMethod = (window as any).selectedMethod || '';
      const population2025 = (window as any).population2025 || 0;
      const waterDemandData = (window as any).totalWaterDemand || {};
      const waterSupply = (window as any).totalWaterSupply || 0;
      
      // Title and header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(projectName, 105, yPos, { align: "center" });
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 105, yPos, { align: "center" });
      yPos += 15;
      
      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      // 1. POPULATION SECTION
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 75, 150);
      doc.text("1. POPULATION FORECAST", 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      // Population method
      doc.setFontSize(10);
      doc.text(`Selected Population Projection Method: ${selectedMethod}`, 20, yPos);
      yPos += 10;
      
      // Population forecast table
      const populationYears = Object.keys(populationData).sort();
      if (populationYears.length > 0) {
        const populationRows = populationYears.map(year => [
          year,
          Math.round(populationData[year]).toLocaleString()
        ]);
        
        autoTable(doc, {
          head: [['Year', 'Projected Population']],
          body: populationRows,
          startY: yPos,
          margin: { left: 20 },
          headStyles: { fillColor: [0, 101, 163] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.text("No population forecast data available.", 20, yPos);
        yPos += 10;
      }

      // 2. WATER DEMAND SECTION
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 75, 150);
      doc.text("2. WATER DEMAND ANALYSIS", 20, yPos);
      doc.setTextColor(0, 0, 0);
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
          margin: { left: 20 },
          headStyles: { fillColor: [0, 101, 163] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.text("No water demand data available.", 20, yPos);
        yPos += 10;
      }

      // 3. WATER SUPPLY SECTION
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 75, 150);
      doc.text("3. WATER SUPPLY ANALYSIS", 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      doc.setFontSize(10);
      if (waterSupply > 0) {
        doc.text(`Total Water Supply: ${waterSupply.toFixed(2)} MLD`, 20, yPos);
        yPos += 10;
        
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
          
          doc.setFontSize(12);
          doc.text("Water Gap Analysis", 20, yPos);
          yPos += 5;
          
          autoTable(doc, {
            head: [['Year', 'Supply (MLD)', 'Demand (MLD)', 'Gap (MLD)', 'Status']],
            body: waterGapRows,
            startY: yPos,
            margin: { left: 20 },
            headStyles: { fillColor: [0, 101, 163] },
            bodyStyles: { fontSize: 9 },
            styles: { cellPadding: 2 }
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      } else {
        doc.text("No water supply data available.", 20, yPos);
        yPos += 10;
      }

      // Check if need to add a new page for sewage section
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      // 4. SEWAGE SECTION
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 75, 150);
      doc.text("4. SEWAGE GENERATION & PEAK FLOW", 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      // Get sewage data if available
      const sewageData = (window as any).selectedPopulationForecast2025 || null;
      
      if (sewageData) {
        doc.setFontSize(10);
        doc.text(`Design Population (2025): ${Math.round(population2025).toLocaleString()}`, 20, yPos);
        yPos += 6;
        doc.text(`Estimated Sewage Generation (2025): ${sewageData.toFixed(2)} MLD`, 20, yPos);
        yPos += 10;
        
        // Peak factors
        doc.setFontSize(12);
        doc.text("Peak Flow Factors", 20, yPos);
        yPos += 8;
        
        const popValue = population2025 || 0;
        const cpheeoFactor = popValue < 20000 ? 3.0 : popValue <= 50000 ? 2.5 : popValue <= 75000 ? 2.25 : 2.0;
        const harmonFactor = 1 + 14 / (4 + Math.sqrt(popValue / 1000));
        const babbittFactor = 5 / Math.pow(popValue/1000, 0.2);
        
        autoTable(doc, {
          head: [['Method', 'Peak Factor', 'Peak Flow (MLD)']],
          body: [
            ['CPHEEO', cpheeoFactor.toFixed(2), (sewageData * cpheeoFactor).toFixed(2)],
            ['Harmon', harmonFactor.toFixed(2), (sewageData * harmonFactor).toFixed(2)],
            ['Babbitt', babbittFactor.toFixed(2), (sewageData * babbittFactor).toFixed(2)]
          ],
          startY: yPos,
          margin: { left: 20 },
          headStyles: { fillColor: [0, 101, 163] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // Sewage Characteristics
        const basePop = populationData["2011"] || 0;
        const baseCoefficient = basePop >= 1000000 ? 150 : 135;
        const totalCoefficient = baseCoefficient * 0.80;
        
        doc.setFontSize(12);
        doc.text("Raw Sewage Characteristics", 20, yPos);
        yPos += 8;
        
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
          margin: { left: 20 },
          headStyles: { fillColor: [0, 101, 163] }
        });
      } else {
        doc.text("No sewage analysis data available.", 20, yPos);
      }
      
      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
      }
      
      // Save the PDF
      doc.save("Water_Sewage_Analysis_Report.pdf");
      
    } catch (err) {
      console.error("Error generating PDF report:", err);
      setError("Failed to generate PDF report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 border border-blue-600 rounded-lg bg-white mt-4 mr-20 shadow-md">

      <h2 className="text-xl font-semibold mb-4 ">Generate Comprehensive Report</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-3">
          Generate a comprehensive PDF report that includes all analysis from:
        </p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          <li>Population Forecast</li>
          <li>Water Demand Analysis</li>
          <li>Water Supply Assessment</li>
          <li>Sewage Generation & Characteristics</li>
        </ul>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={generatePDF}
          disabled={generating}
          className={`px-4 py-2 rounded-md text-white font-medium flex items-center space-x-2 ${
            generating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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