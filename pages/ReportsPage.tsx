import React, { useState, useMemo } from 'react';
import { FuelingRecord, MaintenanceRecord, MaintenanceCategory, Vehicle } from '../types';
import ChartFilter from '../components/ChartFilter';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CHART_COLORS } from '../constants';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// useTheme removed

interface ReportsPageProps {
  fuelingRecords: FuelingRecord[]; 
  maintenanceRecords: MaintenanceRecord[]; 
  activeVehicle?: Vehicle; 
}

interface ChartDataPoint {
  date: string; 
  value: number;
  [key: string]: any; 
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
  name: string;
  value: number;
}


const ReportsPage: React.FC<ReportsPageProps> = ({ fuelingRecords: vehicleFuelingRecords, maintenanceRecords: vehicleMaintenanceRecords, activeVehicle }) => {
  const { currentUser } = useAuth();
  // resolvedTheme removed
  const [filters, setFilters] = useState<{ month: number | null; year: number | null }>({ month: null, year: null });

  const availableYears = useMemo(() => {
    if (!currentUser || !activeVehicle) return [];
    const years = new Set<number>();
    vehicleFuelingRecords.forEach(r => years.add(new Date(r.date).getUTCFullYear()));
    vehicleMaintenanceRecords.forEach(r => years.add(new Date(r.date).getUTCFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [vehicleFuelingRecords, vehicleMaintenanceRecords, activeVehicle, currentUser]);

  const filteredFuelingRecords = useMemo(() => {
    if (!currentUser || !activeVehicle) return [];
    return vehicleFuelingRecords.filter(r => {
      const recordDate = new Date(r.date);
      const monthMatch = filters.month === null || recordDate.getUTCMonth() === filters.month;
      const yearMatch = filters.year === null || recordDate.getUTCFullYear() === filters.year;
      return monthMatch && yearMatch;
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vehicleFuelingRecords, filters, activeVehicle, currentUser]);

  const filteredMaintenanceRecords = useMemo(() => {
    if (!currentUser || !activeVehicle) return [];
    return vehicleMaintenanceRecords.filter(r => {
      const recordDate = new Date(r.date);
      const monthMatch = filters.month === null || recordDate.getUTCMonth() === filters.month;
      const yearMatch = filters.year === null || recordDate.getUTCFullYear() === filters.year;
      return monthMatch && yearMatch;
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vehicleMaintenanceRecords, filters, activeVehicle, currentUser]);

  const fuelPriceData: ChartDataPoint[] = useMemo(() => {
    if (!currentUser) return [];
    return filteredFuelingRecords.map(r => ({
      date: new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC'}),
      value: parseFloat((r.cost / r.liters).toFixed(2)),
      type: r.fuelType
    }));
  }, [filteredFuelingRecords, currentUser]);

  const autonomyData: ChartDataPoint[] = useMemo(() => {
    if (!currentUser) return [];
    return filteredFuelingRecords
      .filter(r => r.kmPerLiter && r.kmPerLiter > 0)
      .map(r => ({
        date: new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC'}),
        value: parseFloat(r.kmPerLiter!.toFixed(2)),
      }));
  }, [filteredFuelingRecords, currentUser]);

  const spendingByCategoryData = useMemo(() => {
    if (!currentUser) return [];
    const spending: { [key in MaintenanceCategory]?: number } = {};
    filteredMaintenanceRecords.forEach(r => {
      spending[r.category] = (spending[r.category] || 0) + r.cost;
    });
    return Object.entries(spending).map(([category, totalCost]) => ({
      name: category as MaintenanceCategory,
      value: parseFloat(totalCost.toFixed(2)),
    }));
  }, [filteredMaintenanceRecords, currentUser]);
  
  const CustomTooltip = ({ active, payload, label, nameKey, valueKey }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      let finalNameKey = nameKey || 'name';
      let finalValueKey = valueKey || 'value';

      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg text-sm text-gray-700">
          {label && <p className="label text-gray-600 font-semibold mb-1">{label}</p>}
          {payload.map((entry: any, index: number) => {
            const name = entry.name || data[finalNameKey] || 'Valor';
            let entryValue = entry.value || data[finalValueKey];

            if (typeof entryValue === 'number') {
              if (name.toLowerCase().includes('preço') || name.toLowerCase().includes('custo') || name.toLowerCase().includes('r$')) {
                entryValue = entryValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              } else if (name.toLowerCase().includes('km/l')) {
                entryValue = `${entryValue.toFixed(2)} km/L`;
              } else {
                entryValue = entryValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
              }
            }
             return (
              <p key={`item-${index}`} style={{ color: entry.color || entry.fill }} className="text-gray-800">
                {`${name}: ${entryValue}`}
              </p>
            );
          })}
          {data.type && <p className="text-xs text-gray-500 mt-1">Tipo: {data.type}</p>}
        </div>
      );
    }
    return null;
  };

  const ChartContainer: React.FC<{ title: string; children: React.ReactElement; height?: number }> = ({ title, children, height = 300 }) => (
    <div className="bg-white p-4 rounded-lg shadow-xl">
      <h2 className="text-xl font-semibold text-blue-600 mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
  
  const tickColor = "#6b7280"; // gray-500
  const gridColor = "#e5e7eb"; // gray-200


  if (!currentUser) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">Por favor, faça login para ver os relatórios.</p>
      </div>
    );
  }
  
  if (!activeVehicle) {
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Relatórios</h1>
        <p className="text-gray-600 mb-6">Por favor, selecione ou adicione um veículo para ver os relatórios.</p>
        <Link 
          to="/vehicles" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
        >
          Gerenciar Veículos
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0 flex items-center">
           <ChartBarIcon className="w-8 h-8 mr-3 text-green-500" />
           Relatórios e Gráficos <span className="text-lg text-gray-500 ml-2">({activeVehicle.name})</span>
        </h1>
      </div>
      
      <ChartFilter onFilterChange={setFilters} availableYears={availableYears} />

      {(filteredFuelingRecords.length === 0 && filteredMaintenanceRecords.length === 0 && (filters.month !== null || filters.year !== null)) && (
        <p className="text-gray-500 text-center py-6 bg-white rounded-lg shadow">
          Nenhum dado encontrado para os filtros selecionados neste veículo.
        </p>
      )}
      {(vehicleFuelingRecords.length === 0 && vehicleMaintenanceRecords.length === 0 && filters.month === null && filters.year === null) && (
         <p className="text-gray-500 text-center py-6 bg-white rounded-lg shadow">
          Não há registros de abastecimento ou manutenção para este veículo. Adicione alguns dados para ver os gráficos.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Evolução do Preço do Combustível (R$/L)">
          {fuelPriceData.length > 0 ? (
            <LineChart data={fuelPriceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={tickColor} tick={{ fontSize: 12 }} />
              <YAxis stroke={tickColor} tickFormatter={(value: number) => `R$${value.toFixed(2)}`} tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: tickColor, strokeWidth: 1 }}/>
              <Legend wrapperStyle={{ fontSize: "14px", color: tickColor }} />
              <Line type="monotone" dataKey="value" name="Preço/L" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[0] }} activeDot={{ r: 5, strokeWidth: 1 }} />
            </LineChart>
          ) : <p className="text-gray-500 text-center pt-10">Sem dados de preço de combustível para o filtro selecionado.</p>}
        </ChartContainer>

        <ChartContainer title="Evolução da Autonomia (Km/L)">
          {autonomyData.length > 0 ? (
            <LineChart data={autonomyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={tickColor} tick={{ fontSize: 12 }} />
              <YAxis stroke={tickColor} tickFormatter={(value: number) => `${value.toFixed(1)}`} unit=" km/L" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: tickColor, strokeWidth: 1 }} />
              <Legend wrapperStyle={{ fontSize: "14px", color: tickColor }} />
              <Line type="monotone" dataKey="value" name="Km/L" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[1] }} activeDot={{ r: 5, strokeWidth: 1 }} />
            </LineChart>
          ) : <p className="text-gray-500 text-center pt-10">Sem dados de autonomia (tanque cheio) para o filtro selecionado.</p>}
        </ChartContainer>
      </div>
      
      <ChartContainer title="Gastos por Categoria de Manutenção" height={400}>
         {spendingByCategoryData.length > 0 ? (
            <BarChart data={spendingByCategoryData} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" stroke={tickColor} tickFormatter={(value: number) => `R$${value.toFixed(0)}`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" stroke={tickColor} width={100} tick={{ fontSize: 12, fill: tickColor }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200, 200, 200, 0.5)'}} />
              <Legend wrapperStyle={{ fontSize: "14px", color: tickColor }} />
              <Bar dataKey="value" name="Custo Total" fill={CHART_COLORS[2]} barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : <p className="text-gray-500 text-center pt-10">Sem dados de gastos com manutenção para o filtro selecionado.</p>}
      </ChartContainer>

      <ChartContainer title="Distribuição de Gastos por Categoria (Pizza)" height={400}>
          {spendingByCategoryData.length > 0 ? (
            <PieChart>
              <Pie
                data={spendingByCategoryData}
                dataKey="value"
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }: PieLabelProps) => `${name}: ${(percent * 100).toFixed(0)}% (R$${value.toFixed(2)})`}
                outerRadius={120}
                fill="#8884d8"
                stroke={'#fff'} 
              >
                {spendingByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip nameKey="name" valueKey="value"/>} />
              <Legend wrapperStyle={{ fontSize: "14px", color: tickColor }} formatter={(value, entry) => <span style={{color: tickColor}}>{value}</span>}/>
            </PieChart>
          ) : <p className="text-gray-500 text-center pt-10">Sem dados de gastos com manutenção para o filtro selecionado.</p>}
        </ChartContainer>
    </div>
  );
};

export default ReportsPage;