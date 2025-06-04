
import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceType, MaintenanceCategory } from '../types';
import { MAINTENANCE_TYPE_OPTIONS, MAINTENANCE_CATEGORY_OPTIONS } from '../constants';

interface MaintenanceFormProps {
  onSubmit: (record: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'> & { date: string }) => void; // Mileage is part of the Omit
  initialData?: MaintenanceRecord | null; 
  onClose: () => void;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ onSubmit, initialData, onClose }) => {
  const [date, setDate] = useState(''); 
  const [mileage, setMileage] = useState(''); // Mileage is now a string to allow empty input
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [type, setType] = useState<MaintenanceType>(MaintenanceType.PREVENTIVE);
  const [category, setCategory] = useState<MaintenanceCategory>(MaintenanceCategory.ENGINE);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.substring(0, 10)); 
      setMileage(initialData.mileage ? String(initialData.mileage) : ''); // Handle null/undefined mileage
      setDescription(initialData.description);
      setCost(String(initialData.cost));
      setType(initialData.type);
      setCategory(initialData.category);
      setNotes(initialData.notes || '');
    } else {
      setDate(new Date().toLocaleDateString('sv-SE'));
      setMileage('');
      setDescription('');
      setCost('');
      setType(MaintenanceType.PREVENTIVE);
      setCategory(MaintenanceCategory.ENGINE);
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!date || !description || !cost) {
      alert('Por favor, preencha Data, Descrição e Custo.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const isoDateString = new Date(Date.UTC(year, month - 1, day)).toISOString();
    
    onSubmit({
      date: isoDateString,
      mileage: mileage ? parseFloat(mileage) : undefined, // Pass as number or undefined
      description,
      cost: parseFloat(cost),
      type,
      category,
      notes,
    });
    onClose();
  };

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="maintenanceDate" className={commonLabelClass}>Data *</label>
        <input type="date" id="maintenanceDate" value={date} onChange={(e) => setDate(e.target.value)} className={commonInputClass} required />
      </div>
      <div>
        <label htmlFor="maintenanceMileage" className={commonLabelClass}>Quilometragem (km)</label>
        <input type="number" id="maintenanceMileage" value={mileage} onChange={(e) => setMileage(e.target.value)} className={commonInputClass} placeholder="Ex: 60000 (Opcional)" step="any" />
      </div>
      <div>
        <label htmlFor="description" className={commonLabelClass}>Descrição *</label>
        <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={commonInputClass} placeholder="Ex: Troca de óleo e filtro" required />
      </div>
      <div>
        <label htmlFor="maintenanceCost" className={commonLabelClass}>Custo Total (R$) *</label>
        <input type="number" id="maintenanceCost" value={cost} onChange={(e) => setCost(e.target.value)} className={commonInputClass} placeholder="Ex: 150.00" required step="any"/>
      </div>
      <div>
        <label htmlFor="maintenanceType" className={commonLabelClass}>Tipo de Manutenção *</label>
        <select id="maintenanceType" value={type} onChange={(e) => setType(e.target.value as MaintenanceType)} className={commonInputClass} required>
          {MAINTENANCE_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="maintenanceCategory" className={commonLabelClass}>Categoria *</label>
        <select id="maintenanceCategory" value={category} onChange={(e) => setCategory(e.target.value as MaintenanceCategory)} className={commonInputClass} required>
          {MAINTENANCE_CATEGORY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className={commonLabelClass}>Notas (Opcional)</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={commonInputClass} placeholder="Detalhes adicionais sobre a manutenção..."></textarea>
      </div>
       <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {initialData ? 'Atualizar' : 'Adicionar'} Manutenção
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;
