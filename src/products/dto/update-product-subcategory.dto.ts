import { IsUUID } from 'class-validator';

export class UpdateProductSubcategoryDto {
  @IsUUID()
  subcategoryId!: string;
}
