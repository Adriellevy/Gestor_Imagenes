import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';

const tsTransformer = {
  to: (value?: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('gi_pedidos')
export class Pedido {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  internacionId: string;

  @ManyToOne(() => Internacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internacionId' })
  internacion?: Internacion;

  @Column({ type: 'varchar', length: 255 })
  servicioSolicitanteId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  creadoPor?: string;

  @Column({ type: 'varchar', length: 50 })
  modalidad: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 50 })
  tipoTraslado: string;

  @Column({ type: 'varchar', length: 255 })
  regionAnatomica: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lateralidad?: string;

  @Column({ type: 'boolean' })
  conContraste: boolean;

  @Column({ type: 'varchar', length: 50 })
  prioridad: string;

  @Column({ type: 'varchar', length: 50 })
  estado: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'bigint', transformer: tsTransformer })
  fechaSolicitud: number;

  @Column({ type: 'simple-json', nullable: true })
  historial?: any[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  avisoPendiente?: string;

  @Column({ type: 'boolean', nullable: true })
  aislamiento?: boolean;

  @Column({ type: 'simple-json', nullable: true })
  ordenMedica?: { nombre: string; datos: string; tipo?: string } | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  casoRojo?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  camaGuardia?: string;

  @Column({ type: 'simple-json', nullable: true })
  emergenciaVista?: { ts: number; por: string } | null;
}
