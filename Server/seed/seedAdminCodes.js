import AdminCode from "../models/AdminCode.js";

const DEFAULT_CODES = [
  "CF-ADMIN-X7K9M",
  "CF-ADMIN-P3R8Q",
  "CF-ADMIN-L5N2W",
  "1234567890",
];

export async function seedAdminCodes() {
  for (const code of DEFAULT_CODES) {
    const exists = await AdminCode.findOne({ code });
    if (!exists) {
      await AdminCode.create({ code, used: false });
      console.log("Seeded admin code:", code);
    }
  }
}
