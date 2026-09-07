import mongoose from "mongoose";
import { Factory } from "../../models/Factory";
import { Audit } from "../../models/Audit";
import { Organization } from "../../models/Organization";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

class FactoryService {
  /**
   * List factories accessible to the user.
   * Admins see all factories; organization users see only their org's factories.
   */
  async listForUser(userId: string, role: string, organizationId?: string) {
    if (role === "admin") {
      if (organizationId) {
        return Factory.find({ organizationId }).sort({ name: 1 }).lean();
      }
      return Factory.find().sort({ name: 1 }).lean();
    }

    const userOrgId = await this.resolveUserOrganizationId(userId);
    return Factory.find({ organizationId: userOrgId }).sort({ name: 1 }).lean();
  }

  async getById(id: string, userId: string, role: string) {
    const factory = await Factory.findById(id).lean();
    if (!factory) throw AppError.notFound("Factory not found");

    if (role !== "admin") {
      const userOrgId = await this.resolveUserOrganizationId(userId);
      if (factory.organizationId.toString() !== userOrgId) {
        throw AppError.forbidden("You do not have access to this factory");
      }
    }

    return factory;
  }

  async create(
    userId: string,
    role: string,
    input: { organizationId: string; name: string; description?: string; location?: string },
  ) {
    if (role !== "admin") {
      const userOrgId = await this.resolveUserOrganizationId(userId);
      if (input.organizationId !== userOrgId) {
        throw AppError.forbidden("You can only create factories in your organization");
      }
    }

    await organizationService.verifyMembership(input.organizationId, userId);

    const factory = await Factory.create({
      organizationId: new mongoose.Types.ObjectId(input.organizationId),
      createdBy: new mongoose.Types.ObjectId(userId),
      name: input.name,
      description: input.description,
      location: input.location,
    });

    return factory.toObject();
  }

  async update(
    id: string,
    userId: string,
    role: string,
    input: { name?: string; description?: string; location?: string },
  ) {
    const factory = await Factory.findById(id);
    if (!factory) throw AppError.notFound("Factory not found");

    if (role !== "admin") {
      const userOrgId = await this.resolveUserOrganizationId(userId);
      if (factory.organizationId.toString() !== userOrgId) {
        throw AppError.forbidden("You do not have access to this factory");
      }
    }

    if (input.name !== undefined) factory.name = input.name;
    if (input.description !== undefined) factory.description = input.description;
    if (input.location !== undefined) factory.location = input.location;

    await factory.save();
    return factory.toObject();
  }

  async delete(id: string, userId: string, role: string) {
    const factory = await Factory.findById(id);
    if (!factory) throw AppError.notFound("Factory not found");

    if (role !== "admin") {
      const userOrgId = await this.resolveUserOrganizationId(userId);
      if (factory.organizationId.toString() !== userOrgId) {
        throw AppError.forbidden("You do not have access to this factory");
      }
    }

    const auditCount = await Audit.countDocuments({ factoryId: id });
    if (auditCount > 0) {
      throw AppError.conflict(
        "Cannot delete factory with existing audits",
        "FACTORY_HAS_AUDITS",
      );
    }

    await factory.deleteOne();
    return { deleted: true };
  }

  /**
   * Get summary stats for each factory in an organization.
   */
  async getFactoryStats(organizationId: string) {
    const factories = await Factory.find({ organizationId }).lean();
    const audits = await Audit.find({ organizationId }).lean();

    const stats = factories.map((factory) => {
      const factoryAudits = audits.filter((a) => a.factoryId.toString() === factory._id.toString());
      const totalAudits = factoryAudits.length;
      const totalFindings = factoryAudits.reduce((sum, a) => sum + (a.findingCounts?.total ?? 0), 0);
      const openCaps = factoryAudits.reduce((sum, a) => sum + (a.capStatus?.open ?? 0), 0);

      return {
        _id: factory._id.toString(),
        name: factory.name,
        description: factory.description,
        location: factory.location,
        totalAudits,
        totalFindings,
        openCaps,
      };
    });

    return stats;
  }

  private async resolveUserOrganizationId(userId: string): Promise<string> {
    const orgs = await Organization.find({
      $or: [{ ownerUserId: userId }, { memberIds: userId }],
    }).lean();
    if (orgs.length === 0) {
      throw AppError.forbidden("You are not a member of any organization");
    }
    return orgs[0]._id.toString();
  }
}

export const factoryService = new FactoryService();
