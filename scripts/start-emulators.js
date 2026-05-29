import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";

const exportPath = resolve("./emulator-data");
const hasData = existsSync(exportPath) && readdirSync(exportPath).length > 0;

if (hasData) {
  console.log("📦 Found emulator-data, importing...");
  execSync("firebase emulators:start --import=./emulator-data", { stdio: "inherit" });
} else {
  console.log("🆕 No emulator-data found, starting fresh...");
  execSync("firebase emulators:start", { stdio: "inherit" });
}
