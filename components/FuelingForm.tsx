import React, { useState, useEffect } from 'react';
import { FuelingRecord, FuelType } from '../types';
import { FUEL_TYPES_OPTIONS } from '../constants';

interface FuelingFormProps {
  onSubmit: (record: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'> & { date: string }) => void; 
  initialData?: FuelingRecord | null; 
  onClose: () => void;
}

const FuelingForm: React.FC<FuelingFormProps> = ({ onSubmit, initialData, onClose }) => {
  const [date, setDate] = useState(''); 
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.GASOLINE);
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [isFullTank, setIsFullTank] = useState(false);
  const [station, setStation] = useState('');

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.substring(0, 10)); 
      setMileage(String(initialData.mileage));
      setFuelType(initialData.fuelType);
      setLiters(String(initialData.liters));
      setCost(String(initialData.cost));
      setIsFullTank(initialData.isFullTank);
      setStation(initialData.station || '');
    } else {
      setDate(new Date().toLocaleDateString('sv-SE'));
      setMileage('');
      setFuelType(FuelType.GASOLINE);
      setLiters('');
      setCost('');
      setIsFullTank(false);
      setStation('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !mileage || !liters || !cost) {
      alert('Por favor, preencha todos os campos obrigatórios: Data, Quilometragem, Litros e Custo.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const isoDateString = new Date(Date.UTC(year, month - 1, day)).toISOString();

    onSubmit({
      date: isoDateString, 
      mileage: parseFloat(mileage),
      fuelType,
      liters: parseFloat(liters),
      cost: parseFloat(cost),
      isFullTank,
      station,
    });
    onClose(); 
  };

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className={commonLabelClass}>Data *</label>
        <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className={commonInputClass} required />
      </div>
      <div>
        <label htmlFor="mileage" className={commonLabelClass}>Quilometragem (km) *</label>
        <input type="number" id="mileage" value={mileage} onChange={(e) => setMileage(e.target.value)} className={commonInputClass} placeholder="Ex: 55000" required step="any" />
      </div>
      <div>
        <label htmlFor="fuelType" className={commonLabelClass}>Tipo de Combustível *</label>
        <select id="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)} className={commonInputClass} required>
          {FUEL_TYPES_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="liters" className={commonLabelClass}>Litros (L) *</label>
        <input type="number" id="liters" value={liters} onChange={(e) => setLiters(e.target.value)} className={commonInputClass} placeholder="Ex: 40.5" required step="any" />
      </div>
      <div>
        <label htmlFor="cost" className={commonLabelClass}>Custo Total (R$) *</label>
        <input type="number" id="cost" value={cost} onChange={(e) => setCost(e.target.value)} className={commonInputClass} placeholder="Ex: 200.00" required step="any"/>
      </div>
      <div>
        <label htmlFor="station" className={commonLabelClass}>Posto (Opcional)</label>
        <input type="text" id="station" value={station} onChange={(e) => setStation(e.target.value)} className={commonInputClass} placeholder="Ex: Posto Shell" />
      </div>
      <div className="flex items-center">
        <input type="checkbox" id="isFullTank" checked={isFullTank} onChange={(e) => setIsFullTank(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        <label htmlFor="isFullTank" className="ml-2 block text-sm text-gray-700">Completei o tanque</label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {initialData ? 'Atualizar' : 'Adicionar'} Abastecimento
        </button>
      </div>
    </form>
  );
};

export default FuelingForm;