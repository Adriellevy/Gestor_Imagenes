import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';
import { Pedido } from './pedido.entity';
import { TipoEstudio } from '../../tipos-estudio/entities/tipo-estudio.entity';

@Entity('gi_estudio_solicitado')
export class EstudioSolicitado {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  pedidoId: string;

  @OneToOne(() => Pedido, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  @Column({ type: 'int' })
  tipoEstudioId: number;

  @ManyToOne(() => TipoEstudio, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tipoEstudioId' })
  tipoEstudio?: TipoEstudio;

  @Column({ type: 'text' })
  descripcion: string;
}
