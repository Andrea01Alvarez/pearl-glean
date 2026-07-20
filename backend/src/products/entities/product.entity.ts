import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Promotion } from '../../promotions/entities/promotion.entity';

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

  @Column({ nullable: true })
  imagePublicId: string;

  @Column('simple-array', { nullable: true })
  additionalImages: string[];

  @Column({ nullable: true })
  altText: string;

  @Column({ type: 'int', nullable: true })
  stock: number;

  @Column({ nullable: true })
  material: string;

  @Column({ nullable: true })
  dimensions: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Promotion, (promotion) => promotion.products)
  promotions: Promotion[];
}
