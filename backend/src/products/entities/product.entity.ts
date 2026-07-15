import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ProductCategory {
  ARETES = 'aretes',
  COLLAR = 'collar',
  PULSERA = 'pulsera',
}

@Entity('productos')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;
}
