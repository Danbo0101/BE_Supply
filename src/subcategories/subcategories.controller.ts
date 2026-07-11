import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryStatusDto } from './dto/update-subcategory-status.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { SubcategoriesService } from './subcategories.service';

@Controller()
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post('categories/:categoryId/subcategories')
  createForCategory(
    @Param('categoryId') categoryId: string,
    @Body() createSubcategoryDto: CreateSubcategoryDto,
  ) {
    return this.subcategoriesService.createForCategory(
      categoryId,
      createSubcategoryDto,
    );
  }

  @Get('categories/:categoryId/subcategories')
  findAllByCategory(@Param('categoryId') categoryId: string) {
    return this.subcategoriesService.findAllByCategory(categoryId);
  }

  @Get('subcategories/:id')
  findOne(@Param('id') id: string) {
    return this.subcategoriesService.findOne(id);
  }

  @Patch('subcategories/:id')
  update(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    return this.subcategoriesService.update(id, updateSubcategoryDto);
  }

  @Patch('subcategories/:id/active')
  updateStatus(
    @Param('id') id: string,
    @Body() updateSubcategoryStatusDto: UpdateSubcategoryStatusDto,
  ) {
    return this.subcategoriesService.updateStatus(
      id,
      updateSubcategoryStatusDto,
    );
  }
}
