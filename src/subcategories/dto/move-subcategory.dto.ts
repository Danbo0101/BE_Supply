import { IsUUID } from 'class-validator';

export class MoveSubcategoryDto {
  @IsUUID()
  targetCategoryId!: string;
}
