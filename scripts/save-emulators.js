import http from "http";
import { existsSync, rmSync, readdirSync, statSync } from "fs";
import { resolve, dirname, basename } from "path";
import { execSync } from "child_process";

const exportPath = resolve("./emulator-data");

// Step 1: Remove existing emulator-data to avoid EPERM on Windows rename
if (existsSync(exportPath)) {
  try {
    rmSync(exportPath, { recursive: true, force: true });
  } catch {
    try {
      execSync(`cmd /c "rmdir /S /Q "${exportPath}""`, { stdio: "ignore" });
    } catch {
      // Will recover below if rename fails
    }
  }
}

// Step 2: Call the Hub export API
const body = JSON.stringify({ path: exportPath });

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: 4400,
    path: "/_admin/export",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      if (res.statusCode === 200) {
        console.log("✅ Emulator data saved to ./emulator-data");
      } else {
        // Step 3: Recover from leftover temp dirs if rename failed
        const root = dirname(exportPath);
        const tempDirs = readdirSync(root)
          .filter((f) => f.startsWith("firebase-export-"))
          .map((f) => resolve(root, f))
          .filter((f) => statSync(f).isDirectory())
          .sort()
          .reverse();

        if (tempDirs.length > 0) {
          const latest = tempDirs[0];
          console.log(`🔄 Recovering data from ${basename(latest)}...`);
          try {
            execSync(`cmd /c "xcopy /E /I /Y "${latest}" "${exportPath}""`, { stdio: "ignore" });
            for (const dir of tempDirs) {
              try { rmSync(dir, { recursive: true, force: true }); } catch {}
            }
            console.log("✅ Emulator data saved to ./emulator-data");
          } catch {
            console.error(`❌ Recovery failed. Data available at: ${basename(latest)}`);
          }
        } else {
          console.error("❌ Export failed:", data);
        }
      }
    });
  }
);

req.on("error", () => {
  console.error("❌ Could not connect to emulators. Are they running?");
  console.error("   Start them first with: pnpm run emulators");
});

req.write(body);
req.end();
