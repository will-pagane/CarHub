
import React, { useState } from 'react';
import { MaintenanceRecord, Vehicle } from '../types'; 
import MaintenanceForm from '../components/MaintenanceForm';
import Modal from '../components/Modal';
import WrenchScrewdriverIcon from '../components/icons/WrenchScrewdriverIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface MaintenancePageProps {
  maintenanceRecords: MaintenanceRecord[]; 
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'>) => Promise<void>; // Now async, mileage is optional from form
  updateMaintenanceRecord: (id: string, record: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'>) => Promise<void>; // Now async
  deleteMaintenanceRecord: (id: string) => Promise<void>; // Now async
  activeVehicle?: Vehicle; 
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ 
  maintenanceRecords, 
  addMaintenanceRecord, 
  updateMaintenanceRecord,
  deleteMaintenanceRecord, 
  activeVehicle 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModalForNew = () => {
    setEditingMaintenanceRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (record: MaintenanceRecord) => {
    setEditingMaintenanceRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingMaintenanceRecord(null);
  };

  const handleSubmitForm = async (data: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'>) => {
    if (!currentUser || !activeVehicle) {
        alert("Usuário ou veículo não ativo. Não é possível salvar.");
        return;
    }
    setIsSubmitting(true);
    try {
        if (editingMaintenanceRecord) {
        await updateMaintenanceRecord(editingMaintenanceRecord.id, data);
        } else {
        await addMaintenanceRecord(data);
        }
        handleCloseModal();
    } catch (error) {
        console.error("Failed to submit maintenance form:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setIsSubmitting(true);
    try {
        await deleteMaintenanceRecord(id);
    } catch (error) {
        console.error("Failed to delete maintenance record:", error);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (!currentUser) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">Por favor, faça login para gerenciar manutenções.</p>
      </div>
    );
  }

  if (!activeVehicle) {
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Manutenções</h1>
        <p className="text-gray-600 mb-6">Por favor, selecione ou adicione um veículo para gerenciar as manutenções.</p>
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
          <WrenchScrewdriverIcon className="w-8 h-8 mr-3 text-purple-500" />
          Registros de Manutenção <span className="text-lg text-gray-500 ml-2" title={activeVehicle.name}>({activeVehicle.name})</span>
        </h1>
        <button
          onClick={handleOpenModalForNew}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center disabled:opacity-50"
          aria-label="Adicionar novo registro de manutenção"
          disabled={isSubmitting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar Manutenção
        </button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={`${editingMaintenanceRecord ? 'Editar' : 'Nova'} Manutenção (${activeVehicle?.name || 'Veículo'})`}
      >
        <MaintenanceForm 
          onSubmit={handleSubmitForm}
          initialData={editingMaintenanceRecord}
          onClose={handleCloseModal} 
        />
      </Modal>

      {maintenanceRecords.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white rounded-lg shadow">Nenhuma manutenção registrada para este veículo.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-xl rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo (R$)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Km</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {maintenanceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                  <td className="px-4 py-4 whitespace-normal text-sm text-gray-700 max-w-xs break-words" title={record.description}>{record.description}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.cost.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.category}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.mileage ? record.mileage.toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleOpenModalForEdit(record)}
                      className="text-blue-600 hover:text-blue-500 p-1 disabled:opacity-50"
                      aria-label={`Editar manutenção: ${record.description}`}
                      disabled={isSubmitting}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRecord(record.id)} 
                      className="text-red-600 hover:text-red-500 p-1 disabled:opacity-50"
                      aria-label={`Excluir manutenção: ${record.description}`}
                      disabled={isSubmitting}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
