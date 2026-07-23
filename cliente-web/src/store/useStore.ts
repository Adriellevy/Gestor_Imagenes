import { create } from 'zustand';
import type { Usuario, Paciente, Internacion, Pedido } from '../types';
import * as api from '../services/api';

interface AppState {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  
  usuarios: Usuario[];
  pacientes: Paciente[];
  internaciones: Internacion[];
  pedidos: Pedido[];
  padron: any[];
  
  loading: boolean;
  
  fetchData: () => Promise<void>;
  createPedido: (pedido: Omit<Pedido, 'id'>) => Promise<void>;
  updatePedido: (id: string, updates: Partial<Pedido>) => Promise<void>;
  cambiarEstadoPedido: (id: string, estado: string, userId: string) => Promise<void>;
  cambiarEmergenciaVista: (id: string) => Promise<void>;
  updateUbicacionInternacion: (internacionId: string, cama: string, sector?: string) => Promise<void>;
  createPaciente: (paciente: Omit<Paciente, 'id'> | Paciente) => Promise<void>;
  createInternacion: (internacion: Omit<Internacion, 'id'> | Internacion) => Promise<void>;
  resetData: () => Promise<void>;
  login: (userId: string) => Promise<void>;
  logout: () => void;

  pedidosTerminados: Pedido[];
  terminadosPage: number;
  terminadosHasMore: boolean;
  terminadosLoading: boolean;
  fetchNextPageTerminados: () => Promise<void>;

  instruccionesAmbulatorio: Record<string, string>;
  setInstruccionesAmbulatorio: (modalidad: string, texto: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  usuarios: [],
  pacientes: [],
  internaciones: [],
  pedidos: [],
  padron: [],
  
  pedidosTerminados: [],
  terminadosPage: 0,
  terminadosHasMore: true,
  terminadosLoading: false,

  instruccionesAmbulatorio: (() => {
    try {
      const stored = localStorage.getItem('instruccionesAmbulatorio');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch (e) {
      // Ignorar error de parseo
    }
    return {
      default: "1) Desde Guardia, siga la cartelería hacia Diagnóstico por Imágenes.\n2) Tome el ascensor central hasta el 2do piso.\n3) Preséntese en la recepción de Imágenes mostrando este código.\n4) Aguarde a ser llamado por su nombre."
    };
  })(),
  setInstruccionesAmbulatorio: (modalidad, texto) => {
    set((state) => {
      const newInstrucciones = { ...state.instruccionesAmbulatorio, [modalidad]: texto };
      localStorage.setItem('instruccionesAmbulatorio', JSON.stringify(newInstrucciones));
      return { instruccionesAmbulatorio: newInstrucciones };
    });
  },

  loading: true,
  
  fetchData: async () => {
    set({ loading: true });
    try {
      const [usuarios, pacientes, internaciones, pedidos, padron] = await Promise.all([
        api.getUsuarios(),
        api.getPacientes(),
        api.getInternaciones(),
        api.getPedidos(),
        api.getPadron()
      ]);
      set({ usuarios, pacientes, internaciones, pedidos, padron, loading: false, pedidosTerminados: [], terminadosPage: 0, terminadosHasMore: true });
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ loading: false });
    }
  },
  
  fetchNextPageTerminados: async () => {
    const { terminadosPage, terminadosHasMore, terminadosLoading } = get();
    if (!terminadosHasMore || terminadosLoading) return;
    
    set({ terminadosLoading: true });
    try {
      const nextPage = terminadosPage + 1;
      const result = await api.getPedidosTerminados(nextPage, 6);
      set((state) => ({
        pedidosTerminados: [...state.pedidosTerminados, ...result.data],
        terminadosPage: nextPage,
        terminadosHasMore: result.data.length === 6,
        terminadosLoading: false
      }));
    } catch (error) {
      console.error('Error fetching terminados:', error);
      set({ terminadosLoading: false });
    }
  },
  
  createPedido: async (pedido) => {
    try {
      const newPedido = await api.createPedido(pedido);
      set((state) => ({ pedidos: [...state.pedidos, newPedido] }));
    } catch (error) {
      console.error('Error creating pedido:', error);
    }
  },
  
  login: async (userId: string) => {
    try {
      const { access_token, user } = await api.login(userId);
      api.setAuthToken(access_token);
      set({ currentUser: user });
    } catch (error) {
      console.error('Error logging in:', error);
    }
  },

  logout: () => {
    api.setAuthToken(null);
    set({ currentUser: null });
  },

  updatePedido: async (id, updates) => {
    try {
      const updatedPedido = await api.updatePedido(id, updates);
      set((state) => ({
        pedidos: state.pedidos.map((p) => (p.id === id ? updatedPedido : p)),
      }));
    } catch (error) {
      console.error('Error updating pedido:', error);
    }
  },
  
  cambiarEstadoPedido: async (id, estado, userId) => {
    try {
      const updatedPedido = await api.cambiarEstadoPedido(id, estado, userId);
      set((state) => ({
        pedidos: state.pedidos.map((p) => (p.id === id ? updatedPedido : p)),
      }));
    } catch (error) {
      console.error('Error changing estado:', error);
    }
  },
  
  createPaciente: async (paciente) => {
    try {
      const newPaciente = await api.createPaciente(paciente);
      set((state) => ({ pacientes: [...state.pacientes, newPaciente] }));
    } catch (error) {
      console.error('Error creating paciente:', error);
    }
  },
  
  createInternacion: async (internacion) => {
    try {
      const newInternacion = await api.createInternacion(internacion);
      set((state) => ({ internaciones: [...state.internaciones, newInternacion] }));
    } catch (error) {
      console.error('Error creating internacion:', error);
    }
  },
  
  cambiarEmergenciaVista: async (id) => {
    const { currentUser, pedidos } = get();
    if (!currentUser) return;
    try {
      set({
        pedidos: pedidos.map((p) =>
          p.id === id ? { ...p, emergenciaVista: { ts: Date.now(), por: currentUser.id } } : p
        ),
      });
      const updatedPedido = await api.acuseReciboEmergencia(id, currentUser.id);
      set((state) => ({
        pedidos: state.pedidos.map((p) => (p.id === id ? updatedPedido : p)),
      }));
    } catch (error) {
      console.error('Error changing emergenciaVista:', error);
    }
  },

  updateUbicacionInternacion: async (internacionId, cama, sector) => {
    try {
      set((state) => ({
        internaciones: state.internaciones.map((i) =>
          i.id === internacionId ? { ...i, ubicacion: { ...i.ubicacion, cama, ...(sector ? { sector } : {}) } } : i
        ),
      }));
      const updatedInternacion = await api.updateUbicacionInternacion(internacionId, cama, sector);
      set((state) => ({
        internaciones: state.internaciones.map((i) => (i.id === internacionId ? updatedInternacion : i)),
      }));
    } catch (error) {
      console.error('Error updating ubicacion internacion:', error);
    }
  },

  resetData: async () => {
    try {
      await api.resetData();
      const [usuarios, pacientes, internaciones, pedidos, padron] = await Promise.all([
        api.getUsuarios(),
        api.getPacientes(),
        api.getInternaciones(),
        api.getPedidos(),
        api.getPadron()
      ]);
      set({ usuarios, pacientes, internaciones, pedidos, padron, pedidosTerminados: [], terminadosPage: 0, terminadosHasMore: true });
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  }
}));
