import mongoose from "mongoose";
import { Notification, type INotification } from "../../models/Notification";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";

export type CreateNotificationInput = {
  userId: string;
  organizationId: string;
  type: INotification["type"];
  title: string;
  message: string;
  entityId?: string;
  entityType?: INotification["entityType"];
};

export class NotificationService {
  /**
   * Create a single notification for a specific user.
   */
  async create(input: CreateNotificationInput): Promise<INotification> {
    return Notification.create({
      userId: input.userId,
      organizationId: input.organizationId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityId: input.entityId,
      entityType: input.entityType,
      read: false,
    });
  }

  /**
   * Notify all members of an organization.
   */
  async notifyOrganizationMembers(
    organizationId: string,
    input: Omit<CreateNotificationInput, "userId" | "organizationId">,
    options: { excludeUserId?: string } = {},
  ): Promise<void> {
    const users = await User.find({ organizationId }).select("_id").lean();

    const docs = users
      .filter((u) => u._id.toString() !== options.excludeUserId)
      .map((u) => ({
        userId: u._id,
        organizationId: new mongoose.Types.ObjectId(organizationId),
        type: input.type,
        title: input.title,
        message: input.message,
        entityId: input.entityId
          ? new mongoose.Types.ObjectId(input.entityId)
          : undefined,
        entityType: input.entityType,
        read: false,
      }));

    if (docs.length > 0) {
      await Notification.insertMany(docs);
    }
  }

  /**
   * List notifications for the current user with pagination.
   */
  async listForUser(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const filter: Record<string, unknown> = { userId };
    if (options.unreadOnly) filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Get the unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false });
  }

  /**
   * Mark a single notification as read (only if it belongs to the user).
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      throw AppError.notFound("Notification not found");
    }

    return notification;
  }

  /**
   * Mark all notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true },
    );
    return { updated: result.modifiedCount };
  }

  /**
   * Delete a notification (only if it belongs to the user).
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    if (result.deletedCount === 0) {
      throw AppError.notFound("Notification not found");
    }
  }
}

export const notificationService = new NotificationService();
