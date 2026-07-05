import axios from 'axios';
import type { Paciente, Internacion, Usuario, Pedido } from '../types';

const API_URL = 'http://localhost:3000';
//const API_URL = 'https://gestoy-imagenes.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const login = async (userId: string): Promise<{ access_token: string, user: Usuario }> => {
  const { data } = await api.post('/auth/login', { userId });
  return data;
};

export const getUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await api.get('/usuarios');
  return data;
};

export const getPacientes = async (): Promise<Paciente[]> => {
  const { data } = await api.get('/pacientes');
  return data;
};

export const getPadron = async (): Promise<any[]> => {
  const { data } = await api.get('/pacientes/padron');
  return data;
};

export const createPaciente = async (paciente: Omit<Paciente, 'id'> | Paciente): Promise<Paciente> => {
  const { data } = await api.post('/pacientes', paciente);
  return data;
};

export const getInternaciones = async (): Promise<Internacion[]> => {
  const { data } = await api.get('/internaciones');
  return data;
};

export const createInternacion = async (internacion: Omit<Internacion, 'id'> | Internacion): Promise<Internacion> => {
  const { data } = await api.post('/internaciones', internacion);
  return data;
};

export const getPedidos = async (): Promise<Pedido[]> => {
  const { data } = await api.get('/pedidos');
  return data;
};

export const getPedidosTerminados = async (page: number = 1, limit: number = 6): Promise<{ data: Pedido[], total: number, page: number, limit: number }> => {
  const { data } = await api.get(`/pedidos/terminados?page=${page}&limit=${limit}`);
  return data;
};

export const createPedido = async (pedido: Omit<Pedido, 'id'>): Promise<Pedido> => {
  const { data } = await api.post('/pedidos', pedido);
  return data;
};

export const updatePedido = async (id: string, updates: Partial<Pedido>): Promise<Pedido> => {
  const { data } = await api.patch(`/pedidos/${id}`, updates);
  return data;
};

export const cambiarEstadoPedido = async (id: string, estado: string, userId: string): Promise<Pedido> => {
  const { data } = await api.patch(`/pedidos/${id}/estado`, { estado, userId });
  return data;
};

export const resetData = async (): Promise<void> => {
  await api.post('/reset');
};
