import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('gi_pacientes')
export class Paciente {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  hc: string;

  @Column({ type: 'simple-json' })
  documento: { tipo: string; numero: string };

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  fechaNacimiento: string;

  @Column({ type: 'varchar', length: 10 })
  sexo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  obraSocial?: string;
}
