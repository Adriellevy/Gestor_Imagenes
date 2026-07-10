import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gi_tipo_estudio')
export class TipoEstudio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  codigo: string; // 'tc' | 'rm' | 'mn' | 'rx' | 'eco' | 'ecocardio'

  @Column({ type: 'varchar', length: 10 })
  tipo: string; // 'IMG' | 'HEMO' — tabla compartida con otro sistema
}
