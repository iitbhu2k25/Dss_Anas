'use client'

import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
import { useMemo } from "react";

// Register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const processData = (results: any) => {
    if (!results) return { labels: [], datasets: [] };

    const allYears = new Set<number>();
    const models = Object.keys(results);

    models.forEach((model) => {
        Object.keys(results[model]).forEach((year) => {
            const yearNum = Number(year);
            if (yearNum !== 2011) allYears.add(yearNum); // Exclude 2011
        });
    });

    let yearsArray = Array.from(allYears).sort((a, b) => a - b);

    // If years are more than 10, show in 5-year intervals
    const interval = yearsArray.length > 10 ? 5 : 1;
    yearsArray = yearsArray.filter(year => (year - yearsArray[0]) % interval === 0);

    return {
        labels: yearsArray.map(String), // X-axis labels (years)
        datasets: models.map((model, index) => ({
            label: model,
            data: yearsArray.map(year => results[model][year] || null),
            borderColor: ["#8884d8", "#82ca9d", "#ffc658", "#ff7300","410445"][index % 5], // Color cycle
            backgroundColor: "rgba(0, 0, 0, 0)", // Transparent fill
            tension: 0.4, // Smooth curve
        }))
    };
};

const PopulationChart = ({ results }: { results: any }) => {
    const chartData = useMemo(() => processData(results), [results]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { title: { display: true, text: "Year" } },
            y: { title: { display: true, text: "Population" } }
        }
    };

    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Population Projection</h2>
            <div style={{ height: "400px" }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default PopulationChart;
