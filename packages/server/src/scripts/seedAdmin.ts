import path from "path";

// Load the server's .env before any other imports so config/env.ts sees the variables.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { User } from "../models/User";

const BCRYPT_ROUNDS = 12;

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@sustainnova.ai";
  const name = process.env.ADMIN_NAME || "Super Admin";
  const password = process.env.ADMIN_PASSWORD || generatePassword();

  await connectDatabase();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (process.env.ADMIN_PASSWORD) {
      existing.passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, BCRYPT_ROUNDS);
      await existing.save();
      await disconnectDatabase();
      console.log("Admin password updated successfully.");
      console.log("----------------------------------");
      console.log(`Email:    ${email}`);
      console.log(`Password: ${process.env.ADMIN_PASSWORD}`);
      console.log("----------------------------------");
      process.exit(0);
    }

    console.log(`Admin user already exists: ${email}`);
    console.log("Set ADMIN_PASSWORD and run the script again to reset the password.");
    await disconnectDatabase();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: "admin",
  });

  await disconnectDatabase();

  console.log("Admin user created successfully.");
  console.log("----------------------------------");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("----------------------------------");
  console.log("Store these credentials securely and change the password after first login.");
}

main().catch(async (error) => {
  console.error("Failed to seed admin user:", error);
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
