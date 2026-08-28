import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';
import { User, UserDocument } from '../users/user.schema';
import { Role } from '../common/roles.enum';

export interface CreateNotificationInput {
  recipientIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
  requestNumber?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findUserIdsByRoles(roles: Role[]): Promise<string[]> {
    const users = await this.userModel.find({ role: { $in: roles }, isActive: true }).select('_id');
    return users.map((u) => String(u._id));
  }

  async createMany(input: CreateNotificationInput): Promise<void> {
    const uniqueIds = [...new Set(input.recipientIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    await this.notificationModel.insertMany(
      uniqueIds.map((recipientId) => ({
        recipient: recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        request: input.requestId,
        requestNumber: input.requestNumber,
        readAt: null,
      })),
    );
  }

  async notifyRoles(
    roles: Role[],
    payload: Omit<CreateNotificationInput, 'recipientIds'>,
    excludeUserId?: string,
  ): Promise<void> {
    let ids = await this.findUserIdsByRoles(roles);
    if (excludeUserId) ids = ids.filter((id) => id !== excludeUserId);
    await this.createMany({ ...payload, recipientIds: ids });
  }

  async findForUser(userId: string, unreadOnly = false) {
    const query: any = { recipient: userId };
    if (unreadOnly) query.readAt = null;
    return this.notificationModel.find(query).sort({ createdAt: -1 }).limit(50);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({ recipient: userId, readAt: null });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException('Notification not found.');
    if (String(notification.recipient) !== userId) {
      throw new NotFoundException('Notification not found.');
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }
    return notification;
  }

  async markAllRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return { ok: true };
  }
}
