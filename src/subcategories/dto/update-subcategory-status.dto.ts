import { IsBoolean } from 'class-validator';

export class UpdateSubcategoryStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
