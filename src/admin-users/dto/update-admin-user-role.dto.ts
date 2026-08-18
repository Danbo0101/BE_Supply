import { IsEnum } from 'class-validator';

import { AdminRole } from '../enums/admin-role.enum';

export class UpdateAdminUserRoleDto {
  @IsEnum(AdminRole)
  role!: AdminRole;
}
