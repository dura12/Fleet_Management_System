import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.findForUser(user.userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user) {
    return this.notificationsService.unreadCount(user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user) {
    return this.notificationsService.markRead(id, user.userId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user) {
    return this.notificationsService.markAllRead(user.userId);
  }
}
