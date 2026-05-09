import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function list() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const users = await User.find(
    {},
    { email: 1, role: 1, name: 1, status: 1 },
  ).lean();
  console.log("Users:", users);
  await mongoose.disconnect();
}

list().catch((e) => {
  console.error(e);
  process.exit(1);
});
