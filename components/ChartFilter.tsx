import React, { useState, useEffect } from 'react';

interface ChartFilterProps {
  onFilterChange: (filters: { month: number | null; year: number | null }) => void;
  availableYears: number[];
}

const months = [
  { value: 0, label: 'Janeiro' }, { value: 1, label: 'Fevereiro' }, { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' }, { value: 4, label: 'Maio' }, { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' }, { value: 7, label: 'Agosto' }, { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' }, { value: 10, label: 'Novembro' }, { value: 11, label: 'Dezembro' }
];

const ChartFilter: React.FC<ChartFilterProps> = ({ onFilterChange, availableYears }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    const month = selectedMonth === 'all' ? null : parseInt(selectedMonth);
    const year = selectedYear === 'all' ? null : parseInt(selectedYear);
    onFilterChange({ month, year });
  }, [selectedMonth, selectedYear, onFilterChange]);

  const commonSelectClass = "block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg shadow">
      <div>
        <label htmlFor="filterMonth" className={commonLabelClass}>Mês</label>
        <select
          id="filterMonth"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={commonSelectClass}
        >
          <option value="all">Todos os Meses</option>
          {months.map(m => (
            <option key={m.value} value={String(m.value)}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filterYear" className={commonLabelClass}>Ano</label>
        <select
          id="filterYear"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className={commonSelectClass}
        >
          <option value="all">Todos os Anos</option>
          {availableYears.sort((a, b) => b - a).map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ChartFilter;