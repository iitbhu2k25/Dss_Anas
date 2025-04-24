const handle1pdfDownload = () => {
    const doc = new jsPDF();
    
    // Document title and metadata
    doc.setFontSize(16);
    doc.text("Sewage Calculation Report", 14, 20);
    
    // Document metadata
    const today = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${today}`, 14, 27);
    
    // Basic information
    doc.setFontSize(12);
    doc.text("Sewage Calculation Method:", 14, 35);
    doc.setFont(undefined, 'normal');
    doc.text(sewageMethod === 'water_supply' ? "Water Supply Method" : 
             "Domestic Sewage Load Estimation", 70, 35);
    
    let yPos = 40;
    
    if (sewageMethod === 'water_supply') {
      doc.text("Total Water Supply:", 14, yPos);
      doc.text(`${totalSupplyInput} MLD`, 70, yPos);
      yPos += 5;
    } else if (sewageMethod === 'domestic_sewage') {
      doc.text("Domestic Load Method:", 14, yPos);
      doc.text(domesticLoadMethod === 'manual' ? "Manual" : "Modeled", 70, yPos);
      yPos += 5;
      
      if (domesticLoadMethod === 'manual') {
        doc.text("Domestic Water Supply:", 14, yPos);
        doc.text(`${domesticSupplyInput} MLD`, 70, yPos);
        yPos += 5;
      }
    }
    
    // Unmetered supply if applicable
    if (unmeteredSupplyInput) {
      doc.text("Unmetered Water Supply:", 14, yPos);
      doc.text(`${unmeteredSupplyInput} MLD`, 70, yPos);
      yPos += 5;
    }
    
    // Add drain information
    doc.text("Number of Drains to be Tapped:", 14, yPos);
    doc.text(`${drainCount}`, 80, yPos);
    yPos += 5;
    
    doc.text("Total Drain Discharge:", 14, yPos);
    doc.text(`${totalDrainDischarge.toFixed(2)} MLD`, 70, yPos);
    yPos += 10;
    
    // Add drain items table if drains exist
    if (drainItems.length > 0) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text("Drain Details:", 14, yPos);
      yPos += 5;
      
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
    
    // Sewage Result
    if (sewageResult) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text("Sewage Generation Results:", 14, yPos);
      yPos += 5;
      
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
    }
    
    // Peak Flow Calculation
    if (peakFlowTable) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text("Peak Flow Calculation Results:", 14, yPos);
      yPos += 5;
      
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
    
    // Check if we need to add a new page for raw sewage characteristics
    if (yPos > 230 && showRawSewage) {
      doc.addPage();
      yPos = 20;
    }
    
    // Raw Sewage Characteristics
    if (showRawSewage) {
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text("Raw Sewage Characteristics:", 14, yPos);
      yPos += 5;
      
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
  
    // Add Geographic Location section if available
    try {
      const locationData = (window as any).selectedLocations || {
        state: '',
        districts: [],
        subDistricts: [],
        villages: [],
        totalPopulation: 0
      };
  
      if (locationData && (locationData.state || locationData.districts.length > 0)) {
        // Check if we need a new page
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.text("Geographic Location:", 14, yPos);
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
        
        if (locationData.villages && locationData.villages.length > 0) {
          const villagesText = Array.isArray(locationData.villages)
            ? `Villages: ${locationData.villages.join(', ')}`
            : `Villages: ${locationData.villages.toString()}`;
          
          const villageLines = doc.splitTextToSize(villagesText, 180);
          doc.text(villageLines, 14, yPos);
          yPos += (villageLines.length * 5) + 3;
        }
        
        if (locationData.totalPopulation) {
          doc.setFont(undefined, 'bold');
          doc.text(`Total Population (2011): ${locationData.totalPopulation.toLocaleString()}`, 14, yPos);
          yPos += 8;
        }
        
        // Add village details if available
        if (locationData.allVillages && locationData.allVillages.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text("Selected Villages with Population:", 14, yPos);
          yPos += 5;
          
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
    } catch (error) {
      console.error("Error adding location data:", error);
    }
    
    // Add Water Demand section if available
    try {
      const waterDemandData = (window as any).totalWaterDemand || {};
      const populationData = (window as any).selectedPopulationForecast || {};
      
      if (Object.keys(waterDemandData).length > 0) {
        // Check if we need a new page
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.text("Water Demand Analysis:", 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Water demand is estimated based on various contributing factors including domestic, floating,", 14, yPos);
        yPos += 5;
        doc.text("and firefighting demands as per CPHEEO manual guidelines.", 14, yPos);
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
      }
    } catch (error) {
      console.error("Error adding water demand data:", error);
    }
    
    // Add Water Supply section if available
    try {
      const waterSupply = (window as any).totalWaterSupply || 0;
      const waterDemandData = (window as any).totalWaterDemand || {};
      
      if (waterSupply > 0) {
        // Check if we need a new page
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.text("Water Supply Analysis:", 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Water supply plays a critical role in determining sewage generation within a region.", 14, yPos);
        yPos += 5;
        doc.text(`The estimated total water supply is: ${waterSupply.toFixed(2)} MLD (Million Liters per Day)`, 14, yPos);
        yPos += 10;
        
        // Water Gap Analysis
        const waterDemandYears = Object.keys(waterDemandData).sort();
        if (waterDemandYears.length > 0) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("Water Gap Analysis:", 14, yPos);
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
      }
    } catch (error) {
      console.error("Error adding water supply data:", error);
    }
    
    // Add References section on a new page
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text("References:", 14, 20);
    yPos = 30;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const references = [
      "1. CPHEEO Manual on Water Supply and Treatment, Ministry of Urban Development, Government of India",
      "2. CPHEEO Manual on Sewerage and Sewage Treatment Systems, Ministry of Urban Development, Government of India",
      "3. Census of India, 2011",
      "4. Guidelines for Decentralized Wastewater Management, Ministry of Environment, Forest and Climate Change",
      "5. IS 1172:1993 - Code of Basic Requirements for Water Supply, Drainage and Sanitation",
      "6. Metcalf & Eddy, Wastewater Engineering: Treatment and Reuse, 4th Edition"
    ];
    
    references.forEach(ref => {
      doc.text(ref, 14, yPos);
      yPos += 6;
    });
    
    // Add notes and footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text("Sewage Calculation Report", 14, doc.internal.pageSize.height - 10);
      
      // Add date to each page footer
      doc.text(today, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    // Add logos to first page if available
    try {
      doc.setPage(1);
      
      // Try to load IIT BHU logo
      const addLogo = async () => {
        try {
          const iitLogo = new Image();
          iitLogo.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            iitLogo.onload = resolve;
            iitLogo.onerror = reject;
            iitLogo.src = "/images/export/logo_iitbhu.png"; // Path in public folder
          });
          doc.addImage(iitLogo, 'PNG', 170, 5, 25, 25);
        } catch (err) {
          console.error("Failed to load logo:", err);
        }
        
        // Save after logo attempt
        doc.save("Sewage_Calculation_Report.pdf");
      };
      
      addLogo();
    } catch (error) {
      // Save without logo if there's an error
      doc.save("Sewage_Calculation_Report.pdf");
    }
  };