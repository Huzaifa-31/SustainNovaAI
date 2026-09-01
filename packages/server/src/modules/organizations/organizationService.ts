import mongoose from "mongoose";
import { Organization } from "../../models/Organization";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";

export class OrganizationService {
  async create(userId: string, input: { name: string; description?: string }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [org] = await Organization.create(
        [
          {
            name: input.name,
            description: input.description,
            ownerUserId: userId,
            memberIds: [userId],
          },
        ],
        { session },
      );

      // Set user's organizationId and role to admin
      await User.findByIdAndUpdate(userId, { organizationId: org._id, role: "admin" }, { session });

      await session.commitTransaction();
      return org;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async listForUser(userId: string) {
    return Organization.find({
      $or: [{ ownerUserId: userId }, { memberIds: userId }],
    }).lean();
  }

  async getById(orgId: string) {
    const org = await Organization.findById(orgId).populate("memberIds", "name email role").lean();
    if (!org) throw AppError.notFound("Organization not found");
    return org;
  }

  async update(orgId: string, userId: string, input: { name?: string; description?: string }) {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (org.ownerUserId.toString() !== userId) {
      throw AppError.forbidden("Only the organization owner can update settings");
    }
    if (input.name !== undefined) org.name = input.name;
    if (input.description !== undefined) org.description = input.description;
    await org.save();
    return org;
  }

  async addMember(orgId: string, requesterId: string, email: string, role?: string) {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (org.ownerUserId.toString() !== requesterId) {
      throw AppError.forbidden("Only the organization owner can add members");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw AppError.notFound("User not found with this email");

    if (org.memberIds.some((id) => id.toString() === user._id.toString())) {
      throw AppError.conflict("User is already a member", "ALREADY_MEMBER");
    }

    org.memberIds.push(user._id as mongoose.Types.ObjectId);
    await org.save();

    user.organizationId = org._id as mongoose.Types.ObjectId;
    if (role) user.role = role as "admin" | "analyst" | "viewer";
    await user.save();

    return org;
  }

  async removeMember(orgId: string, requesterId: string, memberId: string) {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (org.ownerUserId.toString() !== requesterId) {
      throw AppError.forbidden("Only the organization owner can remove members");
    }
    if (org.ownerUserId.toString() === memberId) {
      throw AppError.badRequest("Cannot remove the organization owner");
    }

    org.memberIds = org.memberIds.filter((id) => id.toString() !== memberId);
    await org.save();

    await User.findByIdAndUpdate(memberId, { $unset: { organizationId: 1 } });
    return org;
  }

  /**
   * Verify that a user belongs to the given organization.
   */
  async verifyMembership(orgId: string, userId: string): Promise<void> {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (!org.memberIds.some((id) => id.toString() === userId)) {
      throw AppError.forbidden("You are not a member of this organization");
    }
  }
}

export const organizationService = new OrganizationService();
