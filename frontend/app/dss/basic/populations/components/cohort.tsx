import React from 'react';

interface CohortAgeGroup {
    male: number;
    female: number;
    total: number;
}

interface CohortData {
    year: number;
    data: {
        [ageGroup: string]: CohortAgeGroup;
    };
}

interface CohortProps {
    cohortData: CohortData[];
}

const Cohort: React.FC<CohortProps> = ({ cohortData }) => {
    // Sort age groups by their numeric value for better display
    const sortAgeGroups = (ageGroups: string[]): string[] => {
        return ageGroups.sort((a, b) => {
            const aNum = parseInt(a.split('-')[0]);
            const bNum = parseInt(b.split('-')[0]);
            return aNum - bNum;
        });
    };

    // Calculate totals for the current cohort data
    const calculateTotals = (data: { [ageGroup: string]: CohortAgeGroup }) => {
        let totalMale = 0;
        let totalFemale = 0;
        let grandTotal = 0;

        Object.values(data).forEach(group => {
            totalMale += group.male;
            totalFemale += group.female;
            grandTotal += group.total;
        });

        return { totalMale, totalFemale, grandTotal };
    };

    // If no data is found, don't render anything
    if (cohortData.length === 0) {
        return null;
    }

    // Get all unique age groups across all years
    const allAgeGroups = Array.from(
        new Set(
            cohortData.flatMap(data => Object.keys(data.data))
        )
    );
    const sortedAgeGroups = sortAgeGroups(allAgeGroups);

    return (
        <div className="mt-8 max-w-7xl">
            <h2 className="text-3xl font-bold text-blue-800 mb-6">Cohort Analysis</h2>
            
            <div className="table-container overflow-x-auto border border-gray-200 rounded-xl shadow-lg bg-white">
                <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 sticky top-0">
                        <tr>
                            <th className="border-b px-6 py-4 text-left font-semibold text-sm sticky left-0 bg-gray-100">Age Group</th>
                            {cohortData.map((data, index) => (
                                <th 
                                    key={data.year} 
                                    colSpan={3} 
                                    className={`border-b px-6 py-4 text-center font-semibold text-sm ${
                                        index < cohortData.length - 1 ? 'border-r border-gray-300' : ''
                                    }`}
                                >
                                    {data.year}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="border-b px-6 py-4 text-left font-semibold text-sm sticky left-0 bg-gray-100"></th>
                            {cohortData.map((data, index) => (
                                <React.Fragment key={data.year}>
                                    <th className={`border-b px-6 py-4 text-center font-semibold text-sm ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                        Male
                                    </th>
                                    <th className={`border-b px-6 py-4 text-center font-semibold text-sm ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                        Female
                                    </th>
                                    <th className={`border-b px-6 py-4 text-center font-semibold text-sm ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                        Total
                                    </th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAgeGroups.map((ageGroup, index) => (
                            <tr
                                key={ageGroup}
                                className={`border-b hover:bg-gray-50 transition-colors ${
                                    index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                                }`}
                            >
                                <td className="border-b px-6 py-4 font-medium text-gray-800 sticky left-0 bg-inherit">{ageGroup}</td>
                                {cohortData.map((data, dataIndex) => (
                                    <React.Fragment key={data.year}>
                                        <td className={`border-b px-6 py-4 text-center text-gray-600 ${dataIndex < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {data.data[ageGroup]?.male ?? '-'}
                                        </td>
                                        <td className={`border-b px-6 py-4 text-center text-gray-600 ${dataIndex < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {data.data[ageGroup]?.female ?? '-'}
                                        </td>
                                        <td className={`border-b px-6 py-4 text-center text-gray-600 ${dataIndex < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {data.data[ageGroup]?.total ?? '-'}
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                        
                        {/* Total row */}
                        <tr className="bg-blue-50 font-semibold">
                            <td className="border-b px-6 py-4 text-gray-900 sticky left-0 bg-blue-50">Total</td>
                            {cohortData.map((data, index) => {
                                const totals = calculateTotals(data.data);
                                return (
                                    <React.Fragment key={data.year}>
                                        <td className={`border-b px-6 py-4 text-center text-gray-900 ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {totals.totalMale}
                                        </td>
                                        <td className={`border-b px-6 py-4 text-center text-gray-900 ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {totals.totalFemale}
                                        </td>
                                        <td className={`border-b px-6 py-4 text-center text-gray-900 ${index < cohortData.length - 1 ? 'border-r border-gray-300' : ''}`}>
                                            {totals.grandTotal}
                                        </td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            {/* Total population display */}
            {/* <div className="mt-4 text-right">
                <p className="text-lg font-semibold text-blue-800">
                    Total Populations:{' '}
                    {cohortData.map(data => {
                        const totals = calculateTotals(data.data);
                        return `${data.year}: ${totals.grandTotal}`;
                    }).join(', ')}
                </p>
            </div> */}
        </div>
    );
};

export default Cohort;