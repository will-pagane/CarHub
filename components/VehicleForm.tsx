import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';

interface VehicleFormProps {
  onSubmit: (vehicleData: Omit<Vehicle, 'id' | 'userId'>) => void;
  initialData?: Omit<Vehicle, 'id' | 'userId'> | null; 
  onClose: () => void;
  existingVehicle?: Vehicle | null; 
}

const VehicleForm: React.FC<VehicleFormProps> = ({ onSubmit, initialData, onClose, existingVehicle }) => {
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState('');

  useEffect(() => {
    const dataToLoad = existingVehicle || initialData; 
    if (dataToLoad) {
      setName(dataToLoad.name);
      setMake(dataToLoad.make || '');
      setModel(dataToLoad.model || '');
      setYear(dataToLoad.year ? String(dataToLoad.year) : '');
      setLicensePlate(dataToLoad.licensePlate || '');
    } else {
      setName('');
      setMake('');
      setModel('');
      setYear(String(new Date().getFullYear()));
      setLicensePlate('');
    }
  }, [initialData, existingVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('O nome do veículo é obrigatório.');
      return;
    }
    onSubmit({
      name,
      make,
      model,
      year: year ? parseInt(year, 10) : undefined,
      licensePlate,
    });
    onClose();
  };

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="vehicleName" className={commonLabelClass}>Nome do Veículo *</label>
        <input type="text" id="vehicleName" value={name} onChange={(e) => setName(e.target.value)} className={commonInputClass} placeholder="Ex: Carro Principal, Moto Viagem" required />
      </div>
      <div>
        <label htmlFor="vehicleMake" className={commonLabelClass}>Marca</label>
        <input type="text" id="vehicleMake" value={make} onChange={(e) => setMake(e.target.value)} className={commonInputClass} placeholder="Ex: Honda" />
      </div>
      <div>
        <label htmlFor="vehicleModel" className={commonLabelClass}>Modelo</label>
        <input type="text" id="vehicleModel" value={model} onChange={(e) => setModel(e.target.value)} className={commonInputClass} placeholder="Ex: Civic" />
      </div>
      <div>
        <label htmlFor="vehicleYear" className={commonLabelClass}>Ano</label>
        <input type="number" id="vehicleYear" value={year} onChange={(e) => setYear(e.target.value)} className={commonInputClass} placeholder="Ex: 2023" min="1900" max={new Date().getFullYear() + 1} />
      </div>
      <div>
        <label htmlFor="vehicleLicensePlate" className={commonLabelClass}>Placa</label>
        <input type="text" id="vehicleLicensePlate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className={commonInputClass} placeholder="Ex: BRA2E19" />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
          {existingVehicle ? 'Atualizar' : 'Adicionar'} Veículo
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;