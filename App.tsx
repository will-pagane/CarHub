import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { FuelingRecord, MaintenanceRecord, Vehicle } from './types';
import { useAuth } from './contexts/AuthContext';
import {
  APP_NAME,
  DEFAULT_VEHICLE_DATA,
  ACTIVE_VEHICLE_ID_KEY,
  GOOGLE_CLIENT_ID
} from './constants';
import useLocalStorage from './hooks/useLocalStorage';

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
// !!! IMPORTANT: Replace YOUR_CLOUD_FUNCTIONS_REGION and YOUR_PROJECT_ID with your actual Cloud Function URLs after deployment !!!
const API_BASE_URL_PLACEHOLDER = "southamerica-east1-personalcarmanagement.cloudfunctions.net"; // Example: "us-central1-my-carhub-project.cloudfunctions.net"

// Vehicle Endpoints
const GET_VEHICLES_URL = `https://${API_BASE_URL_PLACEHOLDER}/getVehicles`;
const ADD_VEHICLE_URL = `https://${API_BASE_URL_PLACEHOLDER}/addVehicle`;
const UPDATE_VEHICLE_URL_TEMPLATE = (vehicleId: string) => `https://${API_BASE_URL_PLACEHOLDER}/updateVehicle/${vehicleId}`;
const DELETE_VEHICLE_URL_TEMPLATE = (vehicleId: string) => `https://${API_BASE_URL_PLACEHOLDER}/deleteVehicle/${vehicleId}`;

// User Preferences Endpoints
const GET_USER_PREFERENCES_URL = `https://${API_BASE_URL_PLACEHOLDER}/getUserPreferences`;
const SET_USER_PREFERENCES_URL = `https://${API_BASE_URL_PLACEHOLDER}/setUserPreferences`;

// Fueling Record Endpoints
const GET_FUELING_RECORDS_URL = (vehicleId: string) => `https://${API_BASE_URL_PLACEHOLDER}/getFuelingRecords?vehicleId=${vehicleId}`;
const ADD_FUELING_RECORD_URL = `https://${API_BASE_URL_PLACEHOLDER}/addFuelingRecord`;
const UPDATE_FUELING_RECORD_URL_TEMPLATE = (recordId: string) => `https://${API_BASE_URL_PLACEHOLDER}/updateFuelingRecord/${recordId}`;
const DELETE_FUELING_RECORD_URL_TEMPLATE = (recordId: string) => `https://${API_BASE_URL_PLACEHOLDER}/deleteFuelingRecord/${recordId}`;

// Maintenance Record Endpoints
const GET_MAINTENANCE_RECORDS_URL = (vehicleId: string) => `https://${API_BASE_URL_PLACEHOLDER}/getMaintenanceRecords?vehicleId=${vehicleId}`;
const ADD_MAINTENANCE_RECORD_URL = `https://${API_BASE_URL_PLACEHOLDER}/addMaintenanceRecord`;
const UPDATE_MAINTENANCE_RECORD_URL_TEMPLATE = (recordId: string) => `https://${API_BASE_URL_PLACEHOLDER}/updateMaintenanceRecord/${recordId}`;
const DELETE_MAINTENANCE_RECORD_URL_TEMPLATE = (recordId: string) => `https://${API_BASE_URL_PLACEHOLDER}/deleteMaintenanceRecord/${recordId}`;


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

    if (!authContextIsLoading && !currentUser && !isGsiMisconfigured) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          buttonContainer.innerHTML = "";
          window.google.accounts.id.renderButton(
            buttonContainer,
            { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left' }
          );
          setGsiError(null);
        } catch (error) {
          console.error("Error rendering Google Sign-In button:", error);
          setGsiError("Erro ao renderizar o botão de login do Google. Verifique o console.");
          buttonContainer.innerHTML = "";
        }
      } else {
        console.warn("GSI objects (window.google.accounts.id) not available for button rendering after loading attempt.");
        if (!window.google?.accounts?.id) {
          setGsiError("Serviço de login do Google não pôde ser carregado. Tente recarregar a página.");
        }
      }
    } else {
      buttonContainer.innerHTML = "";
      if (currentUser || isGsiMisconfigured) {
        setGsiError(null);
      }
    }
  }, [authContextIsLoading, currentUser, isGsiMisconfigured, location.key]);

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
          <div id="googleSignInButtonContainer" className="mt-2 mb-4 flex justify-center min-h-[40px]">
            {/* Content will be dynamically inserted */}
          </div>
          <div className="min-h-[20px] text-sm mb-10">
            {gsiError && <p className="text-red-500">{gsiError}</p>}
            {!gsiError && authContextIsLoading && !currentUser && (
              <p className="text-gray-500">Carregando login...</p>
            )}
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

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allFuelingRecords, setAllFuelingRecords] = useState<FuelingRecord[]>([]);
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  const [activeVehicleId, setActiveVehicleId] = useLocalStorage<string | null>(ACTIVE_VEHICLE_ID_KEY, null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(false); // Unified loading state for all data
  const [apiError, setApiError] = useState<string | null>(null);

  const callApi = useCallback(async (url: string, method: string = 'GET', body?: any) => {
    if (!idToken) {
      setApiError("Usuário não autenticado para realizar a operação.");
      console.error("callApi: idToken is null");
      throw new Error("Usuário não autenticado");
    }
    if (API_BASE_URL_PLACEHOLDER === "YOUR_CLOUD_FUNCTIONS_REGION-YOUR_PROJECT_ID.cloudfunctions.net" || API_BASE_URL_PLACEHOLDER === "") {
      const errorMsg = "Configuração da API pendente. O endereço base da API (API_BASE_URL_PLACEHOLDER) precisa ser definido em App.tsx.";
      console.error(errorMsg);
      setApiError(errorMsg);
      throw new Error(errorMsg);
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
      const errorText = await response.text();
      const errorMsg = `Falha na API (${response.status}): ${response.statusText}. Detalhes: ${errorText}`;
      console.error(`API Error ${response.status} for URL ${url}: ${errorText}`);
      throw new Error(errorMsg);
    }
    if (response.status === 204) return null;
    return response.json();
  }, [idToken]);

  useEffect(() => {
    if (currentUser && idToken) {
      setIsLoadingData(true);
      setApiError(null);
      callApi(GET_USER_PREFERENCES_URL)
        .then(data => {
          if (data && data.activeVehicleId) {
            setActiveVehicleId(data.activeVehicleId);
          }
        })
        .catch(err => {
          console.error("Erro ao buscar preferências do usuário:", err);
          setApiError(prev => prev ? `${prev}\nNão foi possível carregar suas preferências.` : "Não foi possível carregar suas preferências.");
        })
        .finally(() => setIsLoadingData(false)); // Separate loading for preferences
    } else if (!currentUser) {
      setActiveVehicleId(null);
    }
  }, [currentUser, idToken, callApi, setActiveVehicleId]);

  useEffect(() => {
    if (currentUser && idToken) {
      setIsLoadingData(true);
      setApiError(null);
      callApi(GET_VEHICLES_URL)
        .then((data: Vehicle[]) => {
          setAllVehicles(data || []);
          if (data && data.length > 0) {
            const currentActiveIsValid = data.some(v => v.id === activeVehicleId);
            if (!activeVehicleId || !currentActiveIsValid) {
              const newActiveId = data[0].id;
              setActiveVehicleId(newActiveId);
              callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: newActiveId })
                .catch(err => console.warn("Failed to save initial active vehicle preference:", err));
            }
          } else {
            setActiveVehicleId(null);
          }
        })
        .catch(err => {
          console.error("Erro ao buscar veículos:", err);
          setApiError(prev => prev ? `${prev}\nNão foi possível carregar seus veículos.` : "Não foi possível carregar seus veículos.");
          setAllVehicles([]);
        })
        .finally(() => setIsLoadingData(false));
    } else if (!currentUser) {
      setAllVehicles([]);
    }
  }, [currentUser, idToken, callApi, activeVehicleId, setActiveVehicleId]);

  // Fetch Fueling and Maintenance records
  useEffect(() => {
    if (currentUser && activeVehicleId && idToken) { // Changed dependency from activeVehicle to activeVehicleId
      setIsLoadingData(true);
      setApiError(null);
      Promise.all([
        callApi(GET_FUELING_RECORDS_URL(activeVehicleId)).catch(err => { // Use activeVehicleId
          console.error(`Error fetching fueling records for ${activeVehicleId}:`, err);
          setApiError(prev => prev ? `${prev}\nFalha ao carregar abastecimentos.` : "Falha ao carregar abastecimentos.");
          return [];
        }),
        callApi(GET_MAINTENANCE_RECORDS_URL(activeVehicleId)).catch(err => { // Use activeVehicleId
          console.error(`Error fetching maintenance records for ${activeVehicleId}:`, err);
          setApiError(prev => prev ? `${prev}\nFalha ao carregar manutenções.` : "Falha ao carregar manutenções.");
          return [];
        })
      ])
        .then(([fuelingData, maintenanceData]) => {
          setAllFuelingRecords((fuelingData as FuelingRecord[]) || []);
          setAllMaintenanceRecords((maintenanceData as MaintenanceRecord[]) || []);
        })
        .finally(() => setIsLoadingData(false));
    } else if (!activeVehicleId) { // Clear records if no activeVehicleId
      setAllFuelingRecords([]);
      setAllMaintenanceRecords([]);
    }
  }, [currentUser, activeVehicleId, idToken, callApi]); // Changed dependency


  const userVehicles = React.useMemo(() => allVehicles, [allVehicles]);

  const activeVehicle = React.useMemo(() => {
    if (!currentUser || !activeVehicleId) return undefined;
    return userVehicles.find(v => v.id === activeVehicleId);
  }, [userVehicles, activeVehicleId, currentUser]);

  const activeFuelingRecords = React.useMemo(() => {
    // Already filtered by backend, just sort if needed (backend sorts by date desc already)
    return allFuelingRecords;
  }, [allFuelingRecords]);

  const activeMaintenanceRecords = React.useMemo(() => {
    // Already filtered by backend, just sort if needed (backend sorts by date desc already)
    return allMaintenanceRecords;
  }, [allMaintenanceRecords]);


  const addFuelingRecord = async (recordData: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!activeVehicle || !currentUser) {
      alert("Veículo ativo ou usuário não encontrado.");
      return;
    }
    setIsLoadingData(true);
    setApiError(null);
    try {
      const newRecord = await callApi(ADD_FUELING_RECORD_URL, 'POST', { ...recordData, vehicleId: activeVehicle.id }) as FuelingRecord;
      setAllFuelingRecords(prev => [newRecord, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); // Add and re-sort
    } catch (err: any) {
      setApiError(err.message || "Falha ao adicionar abastecimento.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateFuelingRecord = async (recordId: string, updatedFormData: Omit<FuelingRecord, 'id' | 'kmPerLiter' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!currentUser || !activeVehicle) return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const updatedRecord = await callApi(UPDATE_FUELING_RECORD_URL_TEMPLATE(recordId), 'PUT', { ...updatedFormData, vehicleId: activeVehicle.id }) as FuelingRecord;
      setAllFuelingRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err: any) {
      setApiError(err.message || "Falha ao atualizar abastecimento.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteFuelingRecord = async (id: string) => {
    if (!currentUser) return;
    if (window.confirm("Tem certeza que deseja excluir este registro de abastecimento?")) {
      setIsLoadingData(true);
      setApiError(null);
      try {
        await callApi(DELETE_FUELING_RECORD_URL_TEMPLATE(id), 'DELETE');
        setAllFuelingRecords(prev => prev.filter(r => r.id !== id));
      } catch (err: any) {
        setApiError(err.message || "Falha ao excluir abastecimento.");
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!activeVehicle || !currentUser) {
      alert("Veículo ativo ou usuário não encontrado.");
      return;
    }
    setIsLoadingData(true);
    setApiError(null);
    try {
      const newRecord = await callApi(ADD_MAINTENANCE_RECORD_URL, 'POST', { ...recordData, vehicleId: activeVehicle.id }) as MaintenanceRecord;
      setAllMaintenanceRecords(prev => [newRecord, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err: any) {
      setApiError(err.message || "Falha ao adicionar manutenção.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateMaintenanceRecord = async (recordId: string, updatedData: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'userId'> & { date: string }) => {
    if (!currentUser || !activeVehicle) return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const updatedRecord = await callApi(UPDATE_MAINTENANCE_RECORD_URL_TEMPLATE(recordId), 'PUT', { ...updatedData, vehicleId: activeVehicle.id }) as MaintenanceRecord;
      setAllMaintenanceRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err: any) {
      setApiError(err.message || "Falha ao atualizar manutenção.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteMaintenanceRecord = async (id: string) => {
    if (!currentUser) return;
    if (window.confirm("Tem certeza que deseja excluir este registro de manutenção?")) {
      setIsLoadingData(true);
      setApiError(null);
      try {
        await callApi(DELETE_MAINTENANCE_RECORD_URL_TEMPLATE(id), 'DELETE');
        setAllMaintenanceRecords(prev => prev.filter(r => r.id !== id));
      } catch (err: any) {
        setApiError(err.message || "Falha ao excluir manutenção.");
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'userId'>) => {
    if (!currentUser) return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const newVehicle = await callApi(ADD_VEHICLE_URL, 'POST', vehicleData) as Vehicle;
      setAllVehicles(prev => [...prev, newVehicle].sort((a, b) => a.name.localeCompare(b.name)));
      if (!activeVehicleId || userVehicles.length === 0) {
        setActiveVehicleId(newVehicle.id); // Automatically select if it's the first or no active
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
          .sort((a, b) => a.name.localeCompare(b.name))
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
    if (window.confirm(`Tem certeza que deseja excluir o veículo "${vehicleToDelete.name}" e TODOS os seus registros de abastecimento e manutenção? Esta ação não pode ser desfeita.`)) {
      setIsLoadingData(true);
      setApiError(null);
      try {
        await callApi(DELETE_VEHICLE_URL_TEMPLATE(vehicleId), 'DELETE');
        const remainingVehicles = allVehicles.filter(v => v.id !== vehicleId);
        setAllVehicles(remainingVehicles);
        // Clear records for the deleted vehicle from local state
        setAllFuelingRecords(prev => prev.filter(r => r.vehicleId !== vehicleId));
        setAllMaintenanceRecords(prev => prev.filter(r => r.vehicleId !== vehicleId));

        if (activeVehicleId === vehicleId) {
          const newActiveId = remainingVehicles.length > 0 ? remainingVehicles[0].id : null;
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
    setActiveVehicleId(vehicleId); // This will trigger useEffect to load records for the new active vehicle
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setApiError(null); // Clear previous errors on vehicle switch
    try {
      await callApi(SET_USER_PREFERENCES_URL, 'POST', { activeVehicleId: vehicleId });
    } catch (err: any) {
      console.warn("Falha ao salvar preferência de veículo ativo no backend:", err.message);
      // Non-critical, preference might not save, but UI will switch.
      setApiError(prev => prev ? `${prev}\nAtenção: Não foi possível salvar sua seleção de veículo no servidor.` : "Atenção: Não foi possível salvar sua seleção de veículo no servidor.");
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate("/");
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    // Other states (allVehicles, allFuelingRecords, etc.) will be cleared by their useEffects when currentUser becomes null
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
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${isActive
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
          {GOOGLE_CLIENT_ID as string !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ? (
            <div className="text-center p-10">
              <p className="text-gray-600 text-lg">Carregando sua sessão...</p>
            </div>
          ) : (
            <LoginScreen />
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
                      onClick={handleSignOut}
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
                      onClick={handleSignOut}
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
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[100]">
            <div className="text-center p-10 text-gray-600 text-lg">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Carregando dados...
            </div>
          </div>
        )}
        {apiError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p className="font-bold">Erro na Comunicação com o Servidor</p>
            <p className="text-sm">{apiError.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</p>
            <button
              onClick={() => setApiError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-700 hover:text-red-900"
              aria-label="Fechar alerta de erro"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}
        {!currentUser ? (
          <LoginScreen />
        ) : (
          <Routes>
            <Route path="/" element={
              activeVehicle ? <HomePage fuelingRecords={activeFuelingRecords} maintenanceRecords={activeMaintenanceRecords} activeVehicle={activeVehicle} /> : (userVehicles.length > 0 && !isLoadingData ? <Navigate to="/" replace /> : <Navigate to="/vehicles" replace />)
            } />
            <Route path="/fuel" element={
              activeVehicle ? <FuelingPage fuelingRecords={activeFuelingRecords} addFuelingRecord={addFuelingRecord} updateFuelingRecord={updateFuelingRecord} deleteFuelingRecord={deleteFuelingRecord} activeVehicle={activeVehicle} /> : <Navigate to="/vehicles" replace />
            } />
            <Route path="/maintenance" element={
              activeVehicle ? <MaintenancePage
                maintenanceRecords={activeMaintenanceRecords}
                addMaintenanceRecord={addMaintenanceRecord}
                updateMaintenanceRecord={updateMaintenanceRecord}
                deleteMaintenanceRecord={deleteMaintenanceRecord}
                activeVehicle={activeVehicle}
              /> : <Navigate to="/vehicles" replace />
            } />
            <Route path="/reports" element={
              activeVehicle ? <ReportsPage fuelingRecords={activeFuelingRecords} maintenanceRecords={activeMaintenanceRecords} activeVehicle={activeVehicle} /> : <Navigate to="/vehicles" replace />
            } />
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
        {(API_BASE_URL_PLACEHOLDER === "YOUR_CLOUD_FUNCTIONS_REGION-YOUR_PROJECT_ID.cloudfunctions.net" || API_BASE_URL_PLACEHOLDER === "") &&
          <p className="text-xs text-red-500 mt-1">Modo de Desenvolvimento: API backend não configurada. Edite App.tsx.</p>
        }
      </footer>
    </div>
  );
};

export default App;