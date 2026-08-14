import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { MoveSubcategoryDto } from './dto/move-subcategory.dto';
import { UpdateSubcategoryStatusDto } from './dto/update-subcategory-status.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { SubcategoriesService } from './subcategories.service';

@Controller()
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post('categories/:categoryId/subcategories')
  @UseGuards(JwtAuthGuard)
  createForCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() createSubcategoryDto: CreateSubcategoryDto,
  ) {
    return this.subcategoriesService.createForCategory(
      categoryId,
      createSubcategoryDto,
    );
  }

  // Search tất cả subcategory
  @Get('subcategories')
  findAll(@Query('query') query?: string) {
    return this.subcategoriesService.findAll(query);
  }

  // Lấy subcategory theo category
  @Get('categories/:categoryId/subcategories')
  findAllByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.subcategoriesService.findAllByCategory(categoryId);
  }

  @Get('subcategories/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subcategoriesService.findOne(id);
  }

  @Patch('subcategories/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    return this.subcategoriesService.update(id, updateSubcategoryDto);
  }

  @Patch('subcategories/:id/category')
  @UseGuards(JwtAuthGuard)
  moveToCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveSubcategoryDto: MoveSubcategoryDto,
  ) {
    return this.subcategoriesService.moveToCategory(id, moveSubcategoryDto);
  }

  @Patch('subcategories/:id/active')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateSubcategoryStatusDto: UpdateSubcategoryStatusDto,
  ) {
    return this.subcategoriesService.updateStatus(
      id,
      updateSubcategoryStatusDto,
    );
  }
}
