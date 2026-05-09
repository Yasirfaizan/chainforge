import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function create() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const email = process.argv[2] || "yasirfaizan680+client@gmail.com";
  const password = process.argv[3] || "1234567890";
  const exists = await User.findOne({ email });
  if (exists) {
    console.log("User already exists:", email);
    await mongoose.disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: "Seeded Client",
    email,
    passwordHash,
    role: "client",
    authMethod: "email",
    status: "Active",
    walletAddress: `seed-client-${Date.now()}`,
  });
  console.log("Created client:", user.email);
  await mongoose.disconnect();
}

create().catch((e) => {
  console.error(e);
  process.exit(1);
});
