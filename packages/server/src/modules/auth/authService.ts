import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, IUser } from "../../models/User";
import { Organization } from "../../models/Organization";
import { AppError } from "../../utils/AppError";
import { env } from "../../config/env";

const BCRYPT_ROUNDS = 12;

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export class AuthService {
  /**
   * Register a new user. If organizationName is provided,
   * creates a new organization and makes the user the admin/owner.
   */
  async register(input: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }): Promise<{ user: IUser; token: string }> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw AppError.conflict("Email already registered", "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Use a session so user + org creation are atomic
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let organizationId: mongoose.Types.ObjectId | undefined;

      if (input.organizationName) {
        // Create a temp user ID to reference as owner
        const tempUserId = new mongoose.Types.ObjectId();

        const [org] = await Organization.create(
          [
            {
              name: input.organizationName,
              ownerUserId: tempUserId,
              memberIds: [tempUserId],
            },
          ],
          { session },
        );

        organizationId = org._id as mongoose.Types.ObjectId;

        const [user] = await User.create(
          [
            {
              _id: tempUserId,
              email: input.email.toLowerCase(),
              passwordHash,
              name: input.name,
              role: "admin",
              organizationId,
            },
          ],
          { session },
        );

        await session.commitTransaction();

        const token = this.generateToken(user);
        return { user, token };
      }

      // No org — create user without org (they can join/create later)
      const [user] = await User.create(
        [
          {
            email: input.email.toLowerCase(),
            passwordHash,
            name: input.name,
            role: "analyst",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Login with email + password, returns JWT token.
   */
  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw AppError.unauthorized("Invalid email or password", "AUTH_INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized("Invalid email or password", "AUTH_INVALID_CREDENTIALS");
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Verify and decode a JWT token.
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw AppError.unauthorized("Invalid or expired token", "AUTH_TOKEN_EXPIRED");
    }
  }

  private generateToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?.toString() ?? "",
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string & jwt.SignOptions["expiresIn"],
    });
  }
}

export const authService = new AuthService();
