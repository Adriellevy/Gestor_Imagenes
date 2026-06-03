import axios from 'axios';
import type { Paciente, Internacion, Usuario, Pedido } from '../types';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

export const getUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await api.get('/usuarios');
  return data;
};

export const getPacientes = async (): Promise<Paciente[]> => {
  const res = await axios.get(`${API_URL}/pacientes`);
  return res.data;
};

export const createPaciente = async (paciente: Omit<Paciente, 'id'> | Paciente): Promise<Paciente> => {
  const res = await axios.post(`${API_URL}/pacientes`, paciente);
  return res.data;
};

export const getInternaciones = async (): Promise<Internacion[]> => {
  const res = await axios.get(`${API_URL}/internaciones`);
  return res.data;
};

export const createInternacion = async (internacion: Omit<Internacion, 'id'> | Internacion): Promise<Internacion> => {
  const res = await axios.post(`${API_URL}/internaciones`, internacion);
  return res.data;
};

export const getPedidos = async (): Promise<Pedido[]> => {
  const { data } = await api.get('/pedidos');
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
