import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';

const tsTransformer = {
  to: (value?: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('gi_internaciones')
export class Internacion {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  pacienteId: string;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pacienteId' })
  paciente?: Paciente;

  @Column({ type: 'varchar', length: 255 })
  servicioId: string;

  @Column({ type: 'simple-json' })
  ubicacion: { sector: string; habitacion: string; cama: string };

  @Column({ type: 'bigint', transformer: tsTransformer })
  fechaIngreso: number;

  @Column({ type: 'bigint', nullable: true, transformer: tsTransformer })
  fechaAlta: number | null;

  @Column({ type: 'varchar', length: 50 })
  estado: string;
}
