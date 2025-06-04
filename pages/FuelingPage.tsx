
import React, { useState } from 'react';
import { FuelingRecord, Vehicle } from '../types'; 
import FuelingForm from '../components/FuelingForm';
import Modal from '../components/Modal';
import FuelIcon from '../components/icons/FuelIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


interface FuelingPageProps {
  fuelingRecords: FuelingRecord[]; 
  addFuelingRecord: (record: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'>) => Promise<void>; // Now async
  updateFuelingRecord: (id: string, record: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'>) => Promise<void>; // Now async
  deleteFuelingRecord: (id: string) => Promise<void>; // Now async
  activeVehicle?: Vehicle; 
}

const FuelingPage: React.FC<FuelingPageProps> = ({ 
  fuelingRecords, 
  addFuelingRecord, 
  updateFuelingRecord, 
  deleteFuelingRecord, 
  activeVehicle 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFuelingRecord, setEditingFuelingRecord] = useState<FuelingRecord | null>(null);
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleOpenModalForNew = () => {
    setEditingFuelingRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (record: FuelingRecord) => {
    setEditingFuelingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setIsModalOpen(false);
    setEditingFuelingRecord(null); 
  };

  const handleSubmitForm = async (data: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'>) => {
    if (!currentUser || !activeVehicle) {
        alert("Usuário ou veículo não ativo. Não é possível salvar.");
        return;
    }
    setIsSubmitting(true);
    try {
        if (editingFuelingRecord) {
        await updateFuelingRecord(editingFuelingRecord.id, data);
        } else {
        await addFuelingRecord(data);
        }
        handleCloseModal();
    } catch (error) {
        // Error is likely handled globally in App.tsx, but local feedback could be added
        console.error("Failed to submit fueling form:", error);
        // alert("Falha ao salvar abastecimento. Verifique os erros no console ou tente novamente.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setIsSubmitting(true); // Use isSubmitting to disable buttons during delete
    try {
        await deleteFuelingRecord(id);
    } catch (error) {
        console.error("Failed to delete fueling record:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  if (!currentUser) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">Por favor, faça login para gerenciar abastecimentos.</p>
      </div>
    );
  }
  
  if (!activeVehicle) {
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Abastecimentos</h1>
        <p className="text-gray-600 mb-6">Por favor, selecione ou adicione um veículo para gerenciar os abastecimentos.</p>
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
          <FuelIcon className="w-8 h-8 mr-3 text-blue-500" />
          Registros de Abastecimento <span className="text-lg text-gray-500 ml-2" title={activeVehicle.name}>({activeVehicle.name})</span>
        </h1>
        <button
          onClick={handleOpenModalForNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center disabled:opacity-50"
          aria-label="Adicionar novo registro de abastecimento"
          disabled={isSubmitting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar Abastecimento
        </button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={`${editingFuelingRecord ? 'Editar' : 'Novo'} Abastecimento (${activeVehicle?.name || 'Veículo'})`}
      >
        <FuelingForm 
          onSubmit={handleSubmitForm} 
          initialData={editingFuelingRecord}
          onClose={handleCloseModal} 
        />
      </Modal>

      {fuelingRecords.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white rounded-lg shadow">Nenhum abastecimento registrado para este veículo.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-xl rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Km Atual</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Litros</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo (R$)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R$/L</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Km/L</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanque Cheio</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posto</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fuelingRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.mileage.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.liters.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.cost.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{(record.cost / record.liters).toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.kmPerLiter ? record.kmPerLiter.toFixed(2) : '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.isFullTank ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 max-w-[150px] truncate" title={record.station}>{record.station || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button 
                      onClick={() => handleOpenModalForEdit(record)}
                      className="text-blue-600 hover:text-blue-500 p-1 disabled:opacity-50"
                      aria-label={`Editar abastecimento de ${new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
                      disabled={isSubmitting}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRecord(record.id)} 
                      className="text-red-600 hover:text-red-500 p-1 disabled:opacity-50"
                      aria-label={`Excluir abastecimento de ${new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
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

export default FuelingPage;
