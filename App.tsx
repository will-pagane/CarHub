

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
// useLocalStorage removed for main data arrays
import { FuelingRecord, MaintenanceRecord, Vehicle } from './types';
import { useAuth } from './contexts/AuthContext';
import { 
  // FUELING_RECORDS_KEY, // No longer used for primary storage
  // MAINTENANCE_RECORDS_KEY, // No longer used for primary storage
  APP_NAME, 
  DEFAULT_VEHICLE_DATA,
  // VEHICLES_KEY, // No longer used for primary storage
  ACTIVE_VEHICLE_ID_KEY, // Still used for local UI preference
  GOOGLE_CLIENT_ID
} from './constants';
import useLocalStorage from './hooks/useLocalStorage'; // Keep for activeVehicleId and theme

import HomePage from './pages/HomePage';
import FuelingPage from './pages/FuelingPage';
import MaintenancePage from './pages/MaintenancePage';
import ReportsPage from './pages/ReportsPage';
import VehiclesPage from './pages/VehiclesPage'; 
import DropdownMenu from './components/DropdownMenu';

import FuelIcon from './components/icons/FuelIcon';
import WrenchScrewdriverIcon from './components/icons/WrenchScrewdriverIcon';
import ChartBarIcon from './components/icons/ChartBarIcon';
import HomeIcon from './components/icons/HomeIcon';
import CarIcon from './components/icons/CarIcon'; 
import UserCircleIcon from './components/icons/UserCircleIcon'; 
import ArrowLeftOnRectangleIcon from './components/icons/ArrowLeftOnRectangleIcon'; 

// --- API Configuration ---
// !!! IMPORTANT: Replace these with your actual Cloud Function URLs after deployment !!!
const API_BASE_URL = "YOUR_CLOUD_FUNCTIONS_REGION-YOUR_PROJECT_ID.cloudfunctions.net"; // Example
const GET_VEHICLES_URL = `https://${API_BASE_URL}/getVehicles`;
const ADD_VEHICLE_URL = `https://${API_BASE_URL}/addVehicle`;
const UPDATE_VEHICLE_URL_TEMPLATE = (vehicleId: string) => `https://${API_BASE_URL}/updateVehicle/${vehicleId}`; // Assuming path param for ID
const DELETE_VEHICLE_URL_TEMPLATE = (vehicleId: string) => `https://${API_BASE_URL}/deleteVehicle/${vehicleId}`; // Assuming path param for ID
const GET_USER_PREFERENCES_URL = `https://${API_BASE_URL}/getUserPreferences`;
const SET_USER_PREFERENCES_URL = `https://${API_BASE_URL}/setUserPreferences`;
// Add URLs for fueling and maintenance later

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9); // Still useful for optimistic updates if needed

interface FeatureCardProps {
  icon: React.ReactElement<{ className?: string }>;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-blue-500/10 transition-shadow w-full">
    <div className="flex items-center justify-center mb-4 text-blue-500">
      {React.cloneElement(icon, { className: "w-12 h-12" })}
    </div>
    <h3 className="text-xl font-semibold text-center text-gray-800 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 text-center">{description}</p>
  </div>
);

const LoginScreen: React.FC = () => {
  const { currentUser, isLoading: authContextIsLoading } = useAuth();
  const isGsiMisconfigured = GOOGLE_CLIENT_ID as string === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
  const [gsiError, setGsiError] = useState<string | null>(null);
  const location = useLocation(); 

  useEffect(() => {
    const buttonContainer = document.getElementById('googleSignInButtonContainer');

    if (!buttonContainer) {
        console.error("Google Sign-In button container (googleSignInButtonContainer) not found in LoginScreen DOM.");
        setGsiError("Elemento para o botão de login não encontrado na página (DOM).");
        return;
    }

    // Conditions for attempting to RENDER the button
    if (!authContextIsLoading && !currentUser && !isGsiMisconfigured) {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            try {
                buttonContainer.innerHTML = ""; // Ensure container is empty before rendering GSI button
                window.google.accounts.id.renderButton(
                    buttonContainer,
                    { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left' }
                );
                setGsiError(null); // Clear any previous GSI error if button renders successfully
            } catch (error) {
                console.error("Error rendering Google Sign-In button:", error);
                setGsiError("Erro ao renderizar o botão de login do Google. Verifique o console.");
                buttonContainer.innerHTML = ""; // Clear container on error
            }
        } else { // GSI JS API not available when expected
            console.warn("GSI objects (window.google.accounts.id) not available for button rendering after loading attempt.");
            // Don't clear buttonContainer.innerHTML here, as status messages might be shown by React based on gsiError
            if (!window.google?.accounts?.id) { // Only set error if GSI SDK itself seems to have failed loading
                setGsiError("Serviço de login do Google não pôde ser carregado. Tente recarregar a página.");
            }
        }
    } else {
        // Conditions for CLEARING the button (e.g., user logged in, GSI misconfigured, or auth context is loading)
        buttonContainer.innerHTML = ""; 
        if (currentUser || isGsiMisconfigured) { // If user is now logged in or GSI is misconfigured, clear any GSI error message
            setGsiError(null);
        }
    }
  }, [authContextIsLoading, currentUser, isGsiMisconfigured, location.key]); // location.key to help re-trigger on navigation if needed

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-center p-4 sm:p-8 bg-gray-50">
      <div className="mb-10">
        <CarIcon className="w-20 h-20 sm:w-24 sm:h-24 text-blue-500 mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Bem-vindo ao {APP_NAME}!</h1>
        <p className="text-gray-600 mb-8 max-w-lg mx-auto">
          Sua plataforma inteligente para gerenciamento veicular. Simplifique o controle de abastecimentos, manutenções e despesas.
        </p>
      </div>

      {isGsiMisconfigured ? (
         <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md mb-6 max-w-md">
            <p className="font-semibold">Configuração Incompleta</p>
            <p className="text-sm">O login com Google ainda não foi configurado pelo administrador. Por favor, tente novamente mais tarde.</p>
          </div>
      ) : (
        <>
          <p className="text-gray-700 mb-2 text-lg">Faça login para continuar:</p>
          {/* This div is EXCLUSIVELY for the Google Sign-In button, managed by useEffect */}
          <div id="googleSignInButtonContainer" className="mt-2 mb-4 flex justify-center min-h-[40px]">
            {/* Content will be dynamically inserted by GSI or cleared by useEffect. */}
          </div>

          {/* Separate container for status messages */}
          <div className="min-h-[20px] text-sm mb-10">
            {gsiError && <p className="text-red-500">{gsiError}</p>}
            {!gsiError && authContextIsLoading && !currentUser && (
                <p className="text-gray-500">Carregando login...</p>
            )}
            {/* Show "Preparando..." if GSI SDK is loaded, not misconfigured, user not logged in, not loading, no error, and button container is empty */}
            {!gsiError && !authContextIsLoading && !currentUser && !isGsiMisconfigured &&
             window.google?.accounts?.id && 
             document.getElementById('googleSignInButtonContainer') && 
             !document.getElementById('googleSignInButtonContainer')?.hasChildNodes() && (
                <p className="text-gray-400">Preparando botão de login...</p>
            )}
          </div>
        </>
      )}
      
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-8">
        <FeatureCard 
          icon={<FuelIcon />} 
          title="Gestão de Abastecimentos" 
          description="Registre seus abastecimentos, controle custos, postos e calcule o consumo médio (km/L) automaticamente." 
        />
        <FeatureCard 
          icon={<WrenchScrewdriverIcon />} 
          title="Histórico de Manutenções" 
          description="Mantenha um histórico detalhado de todas as manutenções, categorizadas por tipo e sistema do veículo." 
        />
        <FeatureCard 
          icon={<ChartBarIcon />} 
          title="Relatórios Detalhados" 
          description="Visualize gráficos interativos sobre seus gastos, consumo, evolução de preços e muito mais para tomar decisões informadas." 
        />
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const { currentUser, signOut, isLoading: authIsLoading, idToken } = useAuth();
  const navigate = useNavigate();

  // State for data fetched from backend
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  // TODO: Initialize fueling and maintenance records similarly when their backend is ready
  const [allFuelingRecords, setAllFuelingRecords] = useLocalStorage<FuelingRecord[]>(`gvi_fuel_local_cache_${currentUser?.id || 'guest'}`, []); // Temp local cache
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useLocalStorage<MaintenanceRecord[]>(`gvi_maint_local_cache_${currentUser?.id || 'guest'}`, []); // Temp local cache


  const [activeVehicleId, setActiveVehicleId] = useLocalStorage<string | null>(ACTIVE_VEHICLE_ID_KEY, null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // --- API Call Helper ---
  const callApi = useCallback(async (url: string, method: string = 'GET', body?: any) => {
    if (!idToken) {
      setApiError("Usuário não autenticado para realizar a operação.");
      console.error("callApi: idToken is null");
      throw new Error("Usuário não autenticado");
    }
    const headers: HeadersInit = {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    };
    const config: RequestInit = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error ${response.status}: ${errorData} for URL ${url}`);
      throw new Error(`Falha na API: ${response.statusText} (${errorData})`);
    }
    if (response.status === 204) return null; // No content for DELETE
    return response.json();
  }, [idToken]);

  // --- Fetch User Preferences (Active Vehicle ID) ---
  useEffect(() => {
    if (currentUser && idToken) {
      setIsLoadingData(true);
      setApiError(null);
      callApi(GET_USER_PREFERENCES_URL)
        .then(data => {
          if (data && data.activeVehicleId) {
            setActiveVehicleId(data.activeVehicleId);
          } else {
            // If no preference from backend, keep local or set to null
            // This logic will be refined when vehicles are loaded
          }
        })
        .catch(err => {
          console.error("Erro ao buscar preferências do usuário:", err);
          setApiError("Não foi possível carregar suas preferências.");
          // Don't clear local activeVehicleId on error, user might still use it
        })
        .finally(() => setIsLoadingData(false));
    } else if (!currentUser) {
        setActiveVehicleId(null); // Clear on logout
    }
  }, [currentUser, idToken, callApi, setActiveVehicleId]);


  // --- Fetch Vehicles ---
  useEffect(() => {
    if (currentUser && idToken) {
      setIsLoadingData(true);
      setApiError(null);
      callApi(GET_VEHICLES_URL)
        .then((data: Vehicle[]) => {
          setAllVehicles(data || []);
          // After vehicles are loaded, set active vehicle
          if (data && data.length > 0) {
            const currentActiveIsValid = data.some(v => v.id === activeVehicleId);
            if (!activeVehicleId || !currentActiveIsValid) {
              const newActiveId = data[0].id;
              setActiveVehicleId(newActiveId);
              // Save this new default active ID to backend
              callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: newActiveId })
                .catch(err => console.warn("Failed to save initial active vehicle preference:", err));
            }
          } else { // No vehicles from backend
             setActiveVehicleId(null);
          }
        })
        .catch(err => {
          console.error("Erro ao buscar veículos:", err);
          setApiError("Não foi possível carregar seus veículos.");
          setAllVehicles([]);
        })
        .finally(() => setIsLoadingData(false));
    } else if (!currentUser) {
      setAllVehicles([]); // Clear on logout
    }
  }, [currentUser, idToken, callApi, activeVehicleId, setActiveVehicleId]);

  // TODO: useEffect to fetch fueling and maintenance records when activeVehicleId and currentUser change

  const userVehicles = React.useMemo(() => {
    // Now directly uses allVehicles fetched from API, filtering by userId is done by backend
    return allVehicles;
  }, [allVehicles]);


  const activeVehicle = React.useMemo(() => {
    if (!currentUser || !activeVehicleId) return undefined;
    return userVehicles.find(v => v.id === activeVehicleId);
  }, [userVehicles, activeVehicleId, currentUser]);

  // --- Fueling and Maintenance records still use local cache for now ---
  const activeFuelingRecords = React.useMemo(() => {
    if (!activeVehicle || !currentUser) return []; 
    return allFuelingRecords
      .filter(r => r.vehicleId === activeVehicle.id && r.userId === currentUser.id) // Keep userId for local cache compatibility
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allFuelingRecords, activeVehicle, currentUser]);

  const activeMaintenanceRecords = React.useMemo(() => {
    if (!activeVehicle || !currentUser) return []; 
    return allMaintenanceRecords
      .filter(r => r.vehicleId === activeVehicle.id && r.userId === currentUser.id) // Keep userId for local cache compatibility
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMaintenanceRecords, activeVehicle, currentUser]);


  const calculateKmPerLiter = useCallback((
    currentRecordToProcess: FuelingRecord, 
    allRecordsForThisVehicleAndUser: FuelingRecord[]
  ): number | undefined => {
    // This logic will move to backend
    if (!currentRecordToProcess.isFullTank) return undefined;
    const sortedPreviousRecords = [...allRecordsForThisVehicleAndUser]
      .filter(r => r.mileage < currentRecordToProcess.mileage && r.id !== currentRecordToProcess.id && new Date(r.date) < new Date(currentRecordToProcess.date)) 
      .sort((a, b) => b.mileage - a.mileage); 
    const previousRecord = sortedPreviousRecords[0];
    if (previousRecord) {
      const kmDriven = currentRecordToProcess.mileage - previousRecord.mileage;
      if (kmDriven > 0 && currentRecordToProcess.liters > 0) { 
        return parseFloat((kmDriven / currentRecordToProcess.liters).toFixed(2));
      }
    }
    return undefined;
  }, []);


  const addFuelingRecord = useCallback((recordData: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!activeVehicle || !currentUser) {
      alert("Veículo ativo ou usuário não encontrado.");
      return;
    }
    // TODO: Replace with API call
    console.warn("addFuelingRecord: API call not implemented yet. Using local cache.");
    const newRecordBase: FuelingRecord = { 
      ...recordData, 
      id: generateId(), 
      vehicleId: activeVehicle.id, 
      userId: currentUser.id,
    };
    setAllFuelingRecords(prevAllRecords => {
        let recordsWithNew = [...prevAllRecords, newRecordBase];
        const finalRecords = recordsWithNew.map(r => {
            if (r.vehicleId === activeVehicle.id && r.userId === currentUser.id) {
                const relevantRecordsForCalc = recordsWithNew.filter(
                    vR => vR.vehicleId === activeVehicle.id && vR.userId === currentUser.id
                );
                return { ...r, kmPerLiter: calculateKmPerLiter(r, relevantRecordsForCalc) };
            }
            return r; 
        });
        return finalRecords;
    });
  }, [activeVehicle, currentUser, calculateKmPerLiter, setAllFuelingRecords]);

  const updateFuelingRecord = useCallback((recordId: string, updatedFormData: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!currentUser) return;
    // TODO: Replace with API call
    console.warn("updateFuelingRecord: API call not implemented yet. Using local cache.");
    setAllFuelingRecords(prevAllRecords => {
      const recordToUpdate = prevAllRecords.find(r => r.id === recordId && r.userId === currentUser.id);
      if (!recordToUpdate) return prevAllRecords; 
      const vehicleIdOfUpdatedRecord = recordToUpdate.vehicleId;
      const userIdOfUpdatedRecord = recordToUpdate.userId; 
      const draftRecords = prevAllRecords.map(r => 
        (r.id === recordId && r.userId === userIdOfUpdatedRecord)
        ? { ...recordToUpdate, ...updatedFormData, date: updatedFormData.date }
        : r
      );
      const finalProcessedRecords = draftRecords.map(recordInLoop => {
        if (recordInLoop.vehicleId === vehicleIdOfUpdatedRecord && recordInLoop.userId === userIdOfUpdatedRecord) {
          const allForThisVehicleAndUser = draftRecords.filter(
              vR => vR.vehicleId === vehicleIdOfUpdatedRecord && vR.userId === userIdOfUpdatedRecord
          );
          return { ...recordInLoop, kmPerLiter: calculateKmPerLiter(recordInLoop, allForThisVehicleAndUser) };
        }
        return recordInLoop; 
      });
      return finalProcessedRecords;
    });
  }, [currentUser, calculateKmPerLiter, setAllFuelingRecords]);

  const deleteFuelingRecord = (id: string) => {
    if (!currentUser) return;
    // TODO: Replace with API call
    console.warn("deleteFuelingRecord: API call not implemented yet. Using local cache.");
    if(window.confirm("Tem certeza que deseja excluir este registro de abastecimento?")) {
      const recordToDelete = allFuelingRecords.find(r => r.id === id && r.userId === currentUser.id);
      if (!recordToDelete) return;
      const vehicleIdOfDeletedRecord = recordToDelete.vehicleId;
      const userIdOfDeletedRecord = recordToDelete.userId; 
      setAllFuelingRecords(prevAllRecords => {
          const recordsAfterDeletion = prevAllRecords.filter(record => 
            !(record.id === id && record.userId === userIdOfDeletedRecord) 
          );
          return recordsAfterDeletion.map(recordInLoop => {
              if (recordInLoop.vehicleId === vehicleIdOfDeletedRecord && recordInLoop.userId === userIdOfDeletedRecord) {
                  const allForThisVehicleAndUser = recordsAfterDeletion.filter(
                      vR => vR.vehicleId === vehicleIdOfDeletedRecord && vR.userId === userIdOfDeletedRecord
                  );
                  return { ...recordInLoop, kmPerLiter: calculateKmPerLiter(recordInLoop, allForThisVehicleAndUser) };
              }
              return recordInLoop;
          });
      });
    }
  };
  
  const addMaintenanceRecord = (recordData: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'mileage' | 'userId'> & { date: string }) => {
    if (!activeVehicle || !currentUser) {
      alert("Veículo ativo ou usuário não encontrado.");
      return;
    }
    // TODO: Replace with API call
    console.warn("addMaintenanceRecord: API call not implemented yet. Using local cache.");
    const newRecord: MaintenanceRecord = {
      ...recordData,
      id: generateId(),
      vehicleId: activeVehicle.id,
      userId: currentUser.id,
      mileage: undefined, 
    };
    setAllMaintenanceRecords(prev => [...prev, newRecord]);
  };

  const updateMaintenanceRecord = (recordId: string, updatedData: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'mileage' | 'userId'> & { date: string }) => {
    if (!currentUser) return;
    // TODO: Replace with API call
    console.warn("updateMaintenanceRecord: API call not implemented yet. Using local cache.");
    setAllMaintenanceRecords(prev => 
      prev.map(record => 
        (record.id === recordId && record.userId === currentUser.id) 
        ? { ...record, ...updatedData, date: updatedData.date, mileage: record.mileage } 
        : record
      )
    );
  };

  const deleteMaintenanceRecord = (id: string) => {
    if (!currentUser) return;
    // TODO: Replace with API call
    console.warn("deleteMaintenanceRecord: API call not implemented yet. Using local cache.");
    if(window.confirm("Tem certeza que deseja excluir este registro de manutenção?")) {
      setAllMaintenanceRecords(prev => prev.filter(record => record.id !== id || record.userId !== currentUser.id));
    }
  };


  // --- Vehicle CRUD with API ---
  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'userId'>) => {
    if (!currentUser) return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const newVehicle = await callApi(ADD_VEHICLE_URL, 'POST', vehicleData) as Vehicle;
      setAllVehicles(prev => [...prev, newVehicle]);
      if (!activeVehicleId || userVehicles.length === 0) { 
        setActiveVehicleId(newVehicle.id);
        await callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: newVehicle.id });
      }
    } catch (err: any) {
      setApiError(err.message || "Falha ao adicionar veículo.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateVehicle = async (vehicleId: string, updatedData: Omit<Vehicle, 'id' | 'userId'>) => {
    if (!currentUser) return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const updatedVehicle = await callApi(UPDATE_VEHICLE_URL_TEMPLATE(vehicleId), 'PUT', updatedData) as Vehicle;
      setAllVehicles(prev => 
        prev.map(vehicle => vehicle.id === vehicleId ? { ...vehicle, ...updatedVehicle } : vehicle)
      );
    } catch (err: any) {
      setApiError(err.message || "Falha ao atualizar veículo.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!currentUser) return;
    const vehicleToDelete = userVehicles.find(v => v.id === vehicleId);
    if (!vehicleToDelete) return;

    if (userVehicles.length === 1) {
      alert("Não é possível excluir o único veículo. Adicione outro veículo primeiro ou edite este.");
      return;
    }
    if(window.confirm(`Tem certeza que deseja excluir o veículo "${vehicleToDelete.name}" e TODOS os seus registros de abastecimento e manutenção? Esta ação não pode ser desfeita.`)) {
      setIsLoadingData(true);
      setApiError(null);
      try {
        await callApi(DELETE_VEHICLE_URL_TEMPLATE(vehicleId), 'DELETE');
        setAllVehicles(prev => prev.filter(v => v.id !== vehicleId));
        // TODO: Also clear local cache for fueling/maintenance of this vehicle when they are migrated
        setAllFuelingRecords(prev => prev.filter(r => r.vehicleId !== vehicleId));
        setAllMaintenanceRecords(prev => prev.filter(r => r.vehicleId !== vehicleId));
        
        if (activeVehicleId === vehicleId) {
           const remainingUserVehicles = allVehicles.filter(v => v.id !== vehicleId); // use state before update
           const newActiveId = remainingUserVehicles.length > 0 ? remainingUserVehicles[0].id : null;
           setActiveVehicleId(newActiveId);
           await callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: newActiveId });
        }
      } catch (err: any) {
        setApiError(err.message || "Falha ao excluir veículo.");
      } finally {
        setIsLoadingData(false);
      }
    }
  };
  
  const selectVehicle = async (vehicleId: string) => {
    if (!currentUser || !allVehicles.some(v => v.id === vehicleId)) return;
    setActiveVehicleId(vehicleId);
    setIsMobileMenuOpen(false); 
    setIsProfileMenuOpen(false);
    // Save preference to backend
    setApiError(null);
    try {
      await callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: vehicleId });
    } catch (err: any) {
      // Non-critical error, preference will be saved on next successful vehicle load if needed
      console.warn("Falha ao salvar preferência de veículo ativo no backend:", err.message);
    }
  };

  const handleSignOut = () => {
    console.log("--- App.tsx: handleSignOut called ---"); 
    signOut(); // AuthContext handles clearing its own state and localStorage
    // App state related to user data is cleared by useEffects depending on currentUser
    navigate("/"); 
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const NavLinkItem: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode; onClick?: () => void }> = ({ to, children, icon, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to || (to === "/" && location.pathname.startsWith("/home")); 

    const handleClick = () => {
      if (onClick) onClick();
      setIsMobileMenuOpen(false); 
      setIsProfileMenuOpen(false);
    };

    return (
      <Link
        to={to}
        onClick={handleClick}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
          isActive 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="mr-2">{icon}</span>
        {children}
      </Link>
    );
  };
  
  const vehicleSelectorId = "vehicle-selector";

  // Initial loading screen while auth is processing
  if (authIsLoading && !currentUser) { 
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
         <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                  <Link to="/" className="flex items-center flex-shrink-0 text-xl font-bold text-blue-600 hover:text-blue-500 transition-colors">
                    <CarIcon className="w-7 h-7 mr-2" />
                    {APP_NAME}
                  </Link>
              </div>
            </div>
        </nav>
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             { /* If GSI is not misconfigured, show generic loading. Otherwise LoginScreen handles it. */ }
            { GOOGLE_CLIENT_ID as string !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ? (
                <div className="text-center p-10">
                    <p className="text-gray-600 text-lg">Carregando sua sessão...</p>
                </div>
            ) : (
                 <LoginScreen /> // Show login screen if GSI is misconfigured
            )}
        </main>
         <footer className="bg-white text-center p-4 text-sm text-gray-500 border-t border-gray-200">
            © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center flex-shrink-0 text-xl font-bold text-blue-600 hover:text-blue-500 transition-colors">
                <CarIcon className="w-7 h-7 mr-2" />
                {APP_NAME}
              </Link>
              {currentUser && activeVehicle && (
                <p className="text-xs text-gray-500 ml-2 hidden sm:block truncate max-w-[150px]" title={activeVehicle.name}>({activeVehicle.name})</p>
              )}
            </div>
            
            <div className="flex items-center">
              {currentUser && userVehicles.length > 0 && (
                <div className="mr-2 hidden md:block"> 
                  <label htmlFor={vehicleSelectorId} className="sr-only">Selecionar Veículo</label>
                  <select
                    id={vehicleSelectorId}
                    value={activeVehicleId || ''}
                    onChange={(e) => selectVehicle(e.target.value)}
                    className="bg-gray-50 text-gray-800 text-sm rounded-md p-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 max-w-[150px] truncate"
                    aria-label="Selecionar veículo ativo"
                    disabled={isLoadingData}
                  >
                    {userVehicles.map(v => (
                      <option key={v.id} value={v.id} title={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="hidden md:block">
                <div className="ml-auto flex items-baseline space-x-2">
                  {currentUser && (
                    <>
                      <NavLinkItem to="/" icon={<HomeIcon className="w-5 h-5" />}>Resumo</NavLinkItem>
                      <NavLinkItem to="/fuel" icon={<FuelIcon className="w-5 h-5" />}>Abastecimentos</NavLinkItem>
                      <NavLinkItem to="/maintenance" icon={<WrenchScrewdriverIcon className="w-5 h-5" />}>Manutenções</NavLinkItem>
                      <NavLinkItem to="/reports" icon={<ChartBarIcon className="w-5 h-5" />}>Relatórios</NavLinkItem>
                      <NavLinkItem to="/vehicles" icon={<CarIcon className="w-5 h-5" />}>Veículos</NavLinkItem>
                    </>
                  )}
                </div>
              </div>
              
              {currentUser && (
                <div className="ml-3 relative">
                   <DropdownMenu
                    triggerButton={
                      <button
                        type="button"
                        className="flex text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 p-1"
                        id="user-menu-button"
                        aria-expanded={isProfileMenuOpen}
                        aria-haspopup="true"
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        title="Menu do usuário"
                      >
                        <span className="sr-only">Abrir menu do usuário</span>
                        {currentUser.picture ? (
                          <img className="h-8 w-8 rounded-full" src={currentUser.picture} alt="Foto do usuário" />
                        ) : (
                          <UserCircleIcon className="h-8 w-8 text-gray-500" />
                        )}
                      </button>
                    }
                    isOpen={isProfileMenuOpen}
                    onClose={() => setIsProfileMenuOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-700">Logado como</p>
                      <p className="text-sm font-medium text-gray-900 truncate" title={currentUser.email || undefined}>
                        {currentUser.name || currentUser.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut} // Direct reference
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      role="menuitem"
                    >
                      <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                      Sair
                    </button>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center">
               {currentUser && ( 
                <button 
                  type="button" 
                  className="text-gray-500 hover:text-gray-700 focus:outline-none mr-2"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <span className="sr-only">Abrir menu principal</span>
                  {isMobileMenuOpen ? (
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
               )}
               {currentUser && !isMobileMenuOpen && ( 
                  <div className="relative">
                    <DropdownMenu
                      triggerButton={
                        <button
                          type="button"
                          className="flex text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 p-0.5"
                          id="user-menu-button-mobile"
                          aria-expanded={isProfileMenuOpen}
                          aria-haspopup="true"
                          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                           title="Menu do usuário"
                        >
                          <span className="sr-only">Abrir menu do usuário</span>
                          {currentUser.picture ? (
                            <img className="h-7 w-7 rounded-full" src={currentUser.picture} alt="Foto do usuário" />
                          ) : (
                            <UserCircleIcon className="h-7 w-7 text-gray-500" />
                          )}
                        </button>
                      }
                      isOpen={isProfileMenuOpen}
                      onClose={() => setIsProfileMenuOpen(false)}
                      menuClasses="origin-top-right right-0 mt-2 w-56" 
                    >
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm text-gray-700">Logado como</p>
                        <p className="text-sm font-medium text-gray-900 truncate" title={currentUser.email || undefined}>
                          {currentUser.name || currentUser.email}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut} // Direct reference
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        role="menuitem"
                      >
                        <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                        Sair
                      </button>
                    </DropdownMenu>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        {currentUser && (
        <div 
          className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-200`} 
          id="mobile-menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
            {activeVehicle && (
                <div className="px-3 py-2 text-sm text-gray-600">Veículo Ativo: <span className="font-semibold">{activeVehicle.name}</span></div>
            )}
            {userVehicles.length > 0 && (
                <div className="px-3 pt-2 pb-3">
                  <label htmlFor="mobile-vehicle-selector" className="block text-xs font-medium text-gray-500 mb-1">Trocar Veículo</label>
                  <select
                    id="mobile-vehicle-selector"
                    value={activeVehicleId || ''}
                    onChange={(e) => selectVehicle(e.target.value)}
                    className="w-full bg-gray-50 text-gray-800 text-sm rounded-md p-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                     aria-label="Selecionar veículo ativo (móvel)"
                     disabled={isLoadingData}
                  >
                    {userVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}
            <NavLinkItem to="/" icon={<HomeIcon className="w-5 h-5" />}>Resumo</NavLinkItem>
            <NavLinkItem to="/fuel" icon={<FuelIcon className="w-5 h-5" />}>Abastecimentos</NavLinkItem>
            <NavLinkItem to="/maintenance" icon={<WrenchScrewdriverIcon className="w-5 h-5" />}>Manutenções</NavLinkItem>
            <NavLinkItem to="/reports" icon={<ChartBarIcon className="w-5 h-5" />}>Relatórios</NavLinkItem>
            <NavLinkItem to="/vehicles" icon={<CarIcon className="w-5 h-5" />}>Veículos</NavLinkItem>
          </div>
        </div>
        )}
      </nav>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingData && (
            <div className="text-center p-10 text-gray-500">Carregando dados...</div>
        )}
        {apiError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro: </strong>
                <span className="block sm:inline">{apiError}</span>
            </div>
        )}
        {!currentUser ? (
          <LoginScreen />
        ) : (
          <Routes>
            <Route path="/" element={
              activeVehicle ? <HomePage fuelingRecords={activeFuelingRecords} maintenanceRecords={activeMaintenanceRecords} activeVehicle={activeVehicle} /> : (userVehicles.length > 0 && !isLoadingData ? <Navigate to="/" replace /> : <Navigate to="/vehicles" replace />) 
            }/>
            <Route path="/fuel" element={
              activeVehicle ? <FuelingPage fuelingRecords={activeFuelingRecords} addFuelingRecord={addFuelingRecord} updateFuelingRecord={updateFuelingRecord} deleteFuelingRecord={deleteFuelingRecord} activeVehicle={activeVehicle} /> : <Navigate to="/vehicles" replace />
            }/>
            <Route path="/maintenance" element={
              activeVehicle ? <MaintenancePage 
                                maintenanceRecords={activeMaintenanceRecords} 
                                addMaintenanceRecord={addMaintenanceRecord} 
                                updateMaintenanceRecord={updateMaintenanceRecord} 
                                deleteMaintenanceRecord={deleteMaintenanceRecord} 
                                activeVehicle={activeVehicle} 
                              /> : <Navigate to="/vehicles" replace />
            }/>
            <Route path="/reports" element={
              activeVehicle ? <ReportsPage fuelingRecords={activeFuelingRecords} maintenanceRecords={activeMaintenanceRecords} activeVehicle={activeVehicle} /> : <Navigate to="/vehicles" replace />
            }/>
            <Route path="/vehicles" element={
              <VehiclesPage 
                vehicles={userVehicles} 
                activeVehicleId={activeVehicleId}
                addVehicle={addVehicle}
                updateVehicle={updateVehicle}
                deleteVehicle={deleteVehicle}
                selectVehicle={selectVehicle}
                isLoading={isLoadingData}
              />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="bg-white text-center p-4 text-sm text-gray-500 border-t border-gray-200">
        © {new Date().getFullYear()} {APP_NAME}. {currentUser && `Logado como ${currentUser.name || currentUser.email || 'Usuário'}. `}Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default App;
