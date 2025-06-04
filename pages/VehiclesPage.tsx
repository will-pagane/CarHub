
import React, { useState } from 'react';
import { Vehicle } from '../types';
import Modal from '../components/Modal';
import VehicleForm from '../components/VehicleForm';
import { DEFAULT_VEHICLE_DATA } from '../constants';
import CarIcon from '../components/icons/CarIcon';
import { useAuth } from '../contexts/AuthContext';


interface VehiclesPageProps {
  vehicles: Vehicle[]; 
  activeVehicleId: string | null;
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'userId'>) => void;
  updateVehicle: (vehicleId: string, vehicleData: Omit<Vehicle, 'id' | 'userId'>) => void;
  deleteVehicle: (vehicleId: string) => void;
  selectVehicle: (vehicleId: string) => void;
  isLoading: boolean; // To disable buttons during API calls
}

const VehiclesPage: React.FC<VehiclesPageProps> = ({
  vehicles,
  activeVehicleId,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  selectVehicle,
  isLoading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { currentUser } = useAuth();

  const handleOpenModalForNew = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSubmitVehicleForm = (vehicleData: Omit<Vehicle, 'id' | 'userId'>) => {
    if (!currentUser) {
      alert("Usuário não autenticado. Não é possível salvar.");
      return;
    }
    if (editingVehicle) {
      updateVehicle(editingVehicle.id, vehicleData);
    } else {
      addVehicle(vehicleData);
    }
    handleCloseModal();
  };

  if (!currentUser) { 
    return (
      <div className="p-4 sm:p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">Por favor, faça login para gerenciar seus veículos.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0 flex items-center">
          <CarIcon className="w-8 h-8 mr-3 text-green-500" />
          Meus Veículos
        </h1>
        <button
          onClick={handleOpenModalForNew}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center disabled:opacity-50"
          aria-label="Adicionar novo veículo"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar Veículo
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`${editingVehicle ? 'Editar' : 'Novo'} Veículo`}
      >
        <VehicleForm
          initialData={editingVehicle ? undefined : DEFAULT_VEHICLE_DATA} 
          existingVehicle={editingVehicle}
          onSubmit={handleSubmitVehicleForm}
          onClose={handleCloseModal}
        />
      </Modal>

      {isLoading && vehicles.length === 0 && (
         <p className="text-gray-500 text-center py-10 bg-white rounded-lg shadow">
          Carregando veículos...
        </p>
      )}

      {!isLoading && vehicles.length === 0 && (
        <p className="text-gray-500 text-center py-10 bg-white rounded-lg shadow">
          Nenhum veículo cadastrado. Adicione seu primeiro veículo para começar!
        </p>
      )}
      
      {vehicles.length > 0 && (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`p-4 rounded-lg shadow-lg transition-all duration-200 ease-in-out
                ${vehicle.id === activeVehicleId 
                  ? 'bg-blue-50 ring-2 ring-blue-500' 
                  : 'bg-white hover:bg-gray-50'}`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-grow mb-3 sm:mb-0">
                  <h2 className={`text-xl font-semibold ${vehicle.id === activeVehicleId ? 'text-blue-700' : 'text-blue-600'}`}>
                    {vehicle.name}
                    {vehicle.id === activeVehicleId && <span className="text-xs ml-2 py-0.5 px-1.5 bg-blue-500 text-white rounded-full align-middle">Ativo</span>}
                  </h2>
                  <p className={`text-sm ${vehicle.id === activeVehicleId ? 'text-blue-600' : 'text-gray-600'}`}>
                    {vehicle.make || '-'} {vehicle.model || '-'} ({vehicle.year || '-'})
                  </p>
                  <p className={`text-sm ${vehicle.id === activeVehicleId ? 'text-blue-600' : 'text-gray-600'}`}>
                    Placa: {vehicle.licensePlate || '-'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2 items-center">
                  {vehicle.id !== activeVehicleId && (
                    <button
                      onClick={() => selectVehicle(vehicle.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm disabled:opacity-50"
                      aria-label={`Definir ${vehicle.name} como ativo`}
                      disabled={isLoading}
                    >
                      Definir Ativo
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenModalForEdit(vehicle)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md shadow-sm disabled:opacity-50"
                    aria-label={`Editar veículo ${vehicle.name}`}
                    disabled={isLoading}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteVehicle(vehicle.id)}
                    className={`px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm 
                                ${vehicles.length === 1 || isLoading ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-700'}`}
                    aria-label={`Excluir veículo ${vehicle.name}`}
                    disabled={vehicles.length === 1 || isLoading}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
