import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Organization } from "../../models/Organization";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";

import { withTransaction } from "../../config/database";

const BCRYPT_ROUNDS = 12;

export class OrganizationService {
  async create(
    adminId: string,
    input: {
      name: string;
      description?: string;
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
    },
  ) {
    return withTransaction(async (session) => {
      const existingUserQuery = User.findOne({ email: input.ownerEmail.toLowerCase() });
      const existingUser = session ? await existingUserQuery.session(session) : await existingUserQuery;
      if (existingUser) {
        throw AppError.conflict("Owner email already registered", "DUPLICATE_EMAIL");
      }

      const passwordHash = await bcrypt.hash(input.ownerPassword, BCRYPT_ROUNDS);

      const [org] = await Organization.create(
        [
          {
            name: input.name,
            description: input.description,
            ownerUserId: adminId,
            memberIds: [adminId],
          },
        ],
        session ? { session } : undefined,
      );

      const [owner] = await User.create(
        [
          {
            email: input.ownerEmail.toLowerCase(),
            passwordHash,
            name: input.ownerName,
            role: "organization",
            organizationId: org._id,
          },
        ],
        session ? { session } : undefined,
      );

      org.ownerUserId = owner._id as mongoose.Types.ObjectId;
      org.memberIds = [owner._id as mongoose.Types.ObjectId];
      if (session) {
        await org.save({ session });
      } else {
        await org.save();
      }

      return org;
    });
  }

  async listForUser(userId: string, role: string) {
    if (role === "admin") {
      return Organization.find().lean();
    }
    return Organization.find({
      $or: [{ ownerUserId: userId }, { memberIds: userId }],
    }).lean();
  }

  async getById(orgId: string, userId: string, role: string) {
    const org = await Organization.findById(orgId).populate("memberIds", "name email role").lean();
    if (!org) throw AppError.notFound("Organization not found");

    if (role !== "admin") {
      if (!org.memberIds.some((id) => id.toString() === userId)) {
        throw AppError.forbidden("You do not have access to this organization");
      }
    }

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

  async updateServices(orgId: string, input: { services?: string[]; tier?: "basic" | "pro" | "enterprise" }) {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (input.services !== undefined) org.services = input.services;
    if (input.tier !== undefined) org.tier = input.tier;
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
    if (role) user.role = role as "admin" | "organization";
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
   * Admins bypass the membership check.
   */
  async verifyMembership(orgId: string, userId: string, role?: string): Promise<void> {
    if (role === "admin") return;

    // If role is not provided, look it up from the user record.
    if (!role) {
      const user = await User.findById(userId).lean();
      if (user?.role === "admin") return;
    }

    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound("Organization not found");
    if (!org.memberIds.some((id) => id.toString() === userId)) {
      throw AppError.forbidden("You are not a member of this organization");
    }
  }
}

export const organizationService = new OrganizationService();
