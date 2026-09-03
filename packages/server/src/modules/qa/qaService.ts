import { Audit } from "../../models";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { qaService } from "../../services/qaService";

class QABusinessService {
  async ask(
    auditId: string,
    question: string,
    userId: string,
  ) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return qaService.ask(
      auditId,
      audit.organizationId.toString(),
      userId,
      question,
    );
  }

  async getHistory(
    auditId: string,
    userId: string,
    page: number,
    limit: number,
  ) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return qaService.getHistory(auditId, page, limit);
  }

  async clearHistory(auditId: string, userId: string) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return qaService.clearHistory(auditId);
  }
}

export const qaBusinessService = new QABusinessService();
