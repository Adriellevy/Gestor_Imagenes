import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('gi_usuarios')
export class Usuario {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  rol: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  servicio?: string;

  @Column({ type: 'simple-json', nullable: true })
  sectores?: string[];
}
