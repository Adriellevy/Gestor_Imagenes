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
  createPaciente: (paciente: Omit<Paciente, 'id'> | Paciente) => Promise<void>;
  createInternacion: (internacion: Omit<Internacion, 'id'> | Internacion) => Promise<void>;
  resetData: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  usuarios: [],
  pacientes: [],
  internaciones: [],
  pedidos: [],
  padron: [],
  
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
      set({ usuarios, pacientes, internaciones, pedidos, padron, loading: false });
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ loading: false });
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
      set({ usuarios, pacientes, internaciones, pedidos, padron });
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  }
}));
