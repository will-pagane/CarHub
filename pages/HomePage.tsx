import React, { useState, useMemo } from 'react';
import { FuelingRecord, MaintenanceRecord, Vehicle } from '../types';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext'; 
// useTheme removed

interface HomePageProps {
  fuelingRecords: FuelingRecord[]; 
  maintenanceRecords: MaintenanceRecord[]; 
  activeVehicle?: Vehicle;
}

const StatCard: React.FC<{ title: string; value: string | number; unit?: string; description?: string; linkTo?: string; activeVehicle?: Vehicle }> = ({ title, value, unit, description, linkTo, activeVehicle }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-shadow flex flex-col justify-between h-full">
    <div>
      <h3 className="text-lg font-semibold text-blue-600">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 my-2">
        {typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: (title === "Média de Consumo" || title === "Km Média Mensal" ? 1:2) , maximumFractionDigits: 2 }) : value}
        {unit && <span className="text-lg ml-1 text-gray-500">{unit}</span>}
      </p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </div>
    {linkTo && activeVehicle && <Link to={linkTo} className="text-sm text-blue-500 hover:text-blue-400 mt-3 inline-block self-start">Ver registros</Link>}
  </div>
);

const DailyCostTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg text-sm">
        <p className="label text-gray-700 font-semibold mb-1">{`Dia: ${label}`}</p>
        <p className="text-gray-900" style={{ color: payload[0].fill }}>
          {`Custo: ${payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
        </p>
      </div>
    );
  }
  return null;
};

const HomePage: React.FC<HomePageProps> = ({ fuelingRecords: vehicleFuelingRecords, maintenanceRecords: vehicleMaintenanceRecords, activeVehicle }) => {
  const { currentUser } = useAuth(); 
  // resolvedTheme removed
  const [startDate, setStartDate] = useState<string>(''); 
  const [endDate, setEndDate] = useState<string>('');   

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value);
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value);
  
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const commonInputClass = "block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";

  const {
    totalFuelCost,
    totalMaintenanceCost,
    totalOverallCost,
    lastFueling,
    lastMaintenance,
    avgKmPerLiter,
    dailyCostData,
    averageMonthlyCost,
    averageMonthlyMileage
  } = useMemo(() => {
    if (!currentUser || !activeVehicle) return { 
      totalFuelCost: 0, totalMaintenanceCost: 0, totalOverallCost: 0,
      lastFueling: null, lastMaintenance: null, avgKmPerLiter: 0, dailyCostData: [],
      averageMonthlyCost: 0, averageMonthlyMileage: 0 
    };

    const filterStart = startDate ? new Date(startDate + "T00:00:00Z") : null; 
    const filterEnd = endDate ? new Date(endDate + "T23:59:59.999Z") : null; 

    const filteredFuelingRecords = vehicleFuelingRecords.filter(record => {
      const recordDate = new Date(record.date); 
      if (filterStart && recordDate < filterStart) return false;
      if (filterEnd && recordDate > filterEnd) return false;
      return true;
    });

    const filteredMaintenanceRecords = vehicleMaintenanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      if (filterStart && recordDate < filterStart) return false;
      if (filterEnd && recordDate > filterEnd) return false;
      return true;
    });

    const tfc = filteredFuelingRecords.reduce((sum, record) => sum + record.cost, 0);
    const tmc = filteredMaintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
    const toc = tfc + tmc;

    const lf = filteredFuelingRecords.length > 0 ? [...filteredFuelingRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    const lm = filteredMaintenanceRecords.length > 0 ? [...filteredMaintenanceRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    
    const validFuelRecordsForAvg = filteredFuelingRecords.filter(r => r.kmPerLiter && r.kmPerLiter > 0);
    const avgKmpl = validFuelRecordsForAvg.length > 0 
      ? validFuelRecordsForAvg.reduce((acc, r) => acc + (r.kmPerLiter || 0), 0) / validFuelRecordsForAvg.length
      : 0;

    const costsByDay: { [key: string]: number } = {};
    filteredFuelingRecords.forEach(r => {
      const dayKey = new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
      costsByDay[dayKey] = (costsByDay[dayKey] || 0) + r.cost;
    });
    filteredMaintenanceRecords.forEach(r => {
      const dayKey = new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
      costsByDay[dayKey] = (costsByDay[dayKey] || 0) + r.cost;
    });
    const dailyCosts = Object.entries(costsByDay)
      .map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(2)) }))
      .sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('/');
          const [dayB, monthB, yearB] = b.date.split('/');
          return new Date(`${yearA}-${monthA}-${dayA}T00:00:00Z`).getTime() - new Date(`${yearB}-${monthB}-${dayB}T00:00:00Z`).getTime();
      });
    
    const uniqueMonths = new Set<string>();
    filteredFuelingRecords.forEach(r => uniqueMonths.add(r.date.substring(0, 7))); 
    filteredMaintenanceRecords.forEach(r => uniqueMonths.add(r.date.substring(0, 7)));
    const numberOfUniqueMonthsWithActivity = uniqueMonths.size;
    const avgMonthlyCost = numberOfUniqueMonthsWithActivity > 0 ? toc / numberOfUniqueMonthsWithActivity : 0;

    let avgMonthlyMileageNum: number = 0;
    if (filteredFuelingRecords.length >= 2) {
      const sortedByMileage = [...filteredFuelingRecords].sort((a, b) => a.mileage - b.mileage);
      const minMileageRec = sortedByMileage[0];
      const maxMileageRec = sortedByMileage[sortedByMileage.length - 1];

      if (maxMileageRec.mileage > minMileageRec.mileage) {
        const totalKmDriven = maxMileageRec.mileage - minMileageRec.mileage;
        
        const date1 = new Date(minMileageRec.date);
        const date2 = new Date(maxMileageRec.date);

        const minDateForMileage = date1 < date2 ? date1 : date2;
        const maxDateForMileage = date1 > date2 ? date1 : date2;
        
        let monthsSpanned = (maxDateForMileage.getUTCFullYear() - minDateForMileage.getUTCFullYear()) * 12 + (maxDateForMileage.getUTCMonth() - minDateForMileage.getUTCMonth()) + 1;
        if (monthsSpanned <= 0) monthsSpanned = 1;

        avgMonthlyMileageNum = totalKmDriven / monthsSpanned;
      }
    }

    return {
      totalFuelCost: tfc,
      totalMaintenanceCost: tmc,
      totalOverallCost: toc,
      lastFueling: lf,
      lastMaintenance: lm,
      avgKmPerLiter: avgKmpl,
      dailyCostData: dailyCosts,
      averageMonthlyCost: avgMonthlyCost,
      averageMonthlyMileage: avgMonthlyMileageNum
    };
  }, [vehicleFuelingRecords, vehicleMaintenanceRecords, startDate, endDate, currentUser, activeVehicle]);

  
  if (!currentUser) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
         <h1 className="text-2xl font-semibold text-gray-800 mb-4">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">Por favor, faça login para acessar o sistema.</p>
      </div>
    );
  }

  if (!activeVehicle) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Nenhum Veículo Selecionado</h1>
        <p className="text-gray-600 mb-6">Por favor, selecione ou adicione um veículo para ver o resumo.</p>
        <Link 
          to="/vehicles" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
        >
          Gerenciar Veículos
        </Link>
      </div>
    );
  }
  
  const tickColor = "#6b7280"; // gray-500
  const gridColor = "#e5e7eb"; // gray-200

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Resumo</h1>
        {activeVehicle && <span className="text-lg text-blue-500" title={activeVehicle.name}>{activeVehicle.name}</span>}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-blue-600 mb-3">Filtrar Período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className={commonLabelClass}>Data Inicial</label>
            <input 
              type="date" 
              id="startDate" 
              value={startDate} 
              onChange={handleStartDateChange} 
              className={commonInputClass} 
              aria-label="Data inicial do filtro"
            />
          </div>
          <div>
            <label htmlFor="endDate" className={commonLabelClass}>Data Final</label>
            <input 
              type="date" 
              id="endDate" 
              value={endDate} 
              onChange={handleEndDateChange} 
              className={commonInputClass} 
              aria-label="Data final do filtro"
              min={startDate || undefined}
            />
          </div>
          <div className="md:mt-0 mt-4">
            <button 
              onClick={clearFilters} 
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow transition-colors h-10 flex items-center justify-center"
              aria-label="Limpar filtros de data"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard title="Custo Total com Combustível" value={totalFuelCost} unit="R$" description="Soma de abastecimentos no período." linkTo="/fuel" activeVehicle={activeVehicle} />
        <StatCard title="Custo Total com Manutenção" value={totalMaintenanceCost} unit="R$" description="Soma de manutenções no período." linkTo="/maintenance" activeVehicle={activeVehicle} />
        <StatCard title="Custo Geral do Veículo" value={totalOverallCost} unit="R$" description="Combustível + Manutenções no período." activeVehicle={activeVehicle} />
        <StatCard title="Média de Consumo" value={avgKmPerLiter} unit="km/L" description="Média no período (tanque cheio)." activeVehicle={activeVehicle} />
        <StatCard title="Custo Médio Mensal" value={averageMonthlyCost} unit="R$/mês" description="Custo total médio por mês no período." activeVehicle={activeVehicle} />
        <StatCard title="Km Média Mensal" value={averageMonthlyMileage} unit="km/mês" description="Quilometragem média por mês no período." activeVehicle={activeVehicle} />
        
        {lastFueling ? (
          <StatCard 
            title="Último Abastecimento" 
            value={new Date(lastFueling.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} 
            description={`R$ ${lastFueling.cost.toFixed(2)} (${lastFueling.liters.toFixed(2)}L) - ${lastFueling.mileage.toLocaleString('pt-BR')} km`}
            linkTo="/fuel"
            activeVehicle={activeVehicle}
          />
        ) : (
          <StatCard title="Último Abastecimento" value="-" description="Nenhum registro no período." activeVehicle={activeVehicle} />
        )}
        {lastMaintenance ? (
          <StatCard 
            title="Última Manutenção" 
            value={new Date(lastMaintenance.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} 
            description={`${lastMaintenance.description} - R$ ${lastMaintenance.cost.toFixed(2)}`}
            linkTo="/maintenance"
            activeVehicle={activeVehicle}
          />
        ) : (
          <StatCard title="Última Manutenção" value="-" description="Nenhum registro no período." activeVehicle={activeVehicle} />
        )}
      </div>

      <div className="mt-8 bg-white p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-semibold text-blue-600 mb-4">Evolução Diária de Custos</h2>
        {dailyCostData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyCostData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={tickColor} tick={{ fontSize: 12 }} />
              <YAxis stroke={tickColor} tickFormatter={(value: number) => `R$${value.toFixed(0)}`} tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip content={<DailyCostTooltip />} cursor={{fill: 'rgba(200, 200, 200, 0.5)'}}/>
              <Legend wrapperStyle={{ fontSize: "14px", paddingTop: '10px' }} />
              <Bar dataKey="cost" name="Custo Diário" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">
            { (startDate || endDate) ? "Nenhum custo registrado para o período selecionado." : "Sem dados de custo para exibir o gráfico."}
          </p>
        )}
      </div>

       <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-blue-600 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/fuel" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors">
            Registrar Abastecimento
          </Link>
          <Link to="/maintenance" className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors">
            Registrar Manutenção
          </Link>
          <Link to="/reports" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors">
            Ver Relatórios
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;