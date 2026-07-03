import { IsUUID } from 'class-validator';

export class UpdateProductCategoryDto {
  @IsUUID()
  categoryId!: string;
}
