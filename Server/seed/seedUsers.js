import bcrypt from "bcryptjs";
import User from "../models/User.js";

const DEFAULT_ADMIN = {
  name: "Default Admin",
  email: "yasirfaizan680@gmail.com",
  password: "1234567890",
};

const DEFAULT_CLIENT = {
  name: "Default Client",
  email: "yasirfaizan680@gmail.com",
  password: "1234567890",
};
export async function seedDefaultAdmin() {
  const exists = await User.findOne({ email: DEFAULT_ADMIN.email });
  if (!exists) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      passwordHash,
      role: "admin",
      authMethod: "email",
      status: "Active",
    });
    console.log("Seeded default admin user:", DEFAULT_ADMIN.email);
  }
}

export async function seedDefaultClient() {
  const exists = await User.findOne({ email: DEFAULT_CLIENT.email });
  if (!exists) {
    const passwordHash = await bcrypt.hash(DEFAULT_CLIENT.password, 12);
    await User.create({
      name: DEFAULT_CLIENT.name,
      email: DEFAULT_CLIENT.email,
      passwordHash,
      role: "client",
      authMethod: "email",
      status: "Active",
      walletAddress: `seed-client-${Date.now()}`,
    });
    console.log("Seeded default client user:", DEFAULT_CLIENT.email);
  }
}
