#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const viteBin = join(repoRoot, "node_modules", "vite", "bin", "vite.js");
const keepTemp = process.env.CONSUMER_SMOKE_KEEP_TEMP === "1";

const requiredPackageFiles = [
  "README.md",
  "package.json",
  "dist/style.css",
  "dist/web-components.js",
  "dist/components/clockify-select.js",
  "dist/components/clockify-project-picker.js",
  "dist/components/clockify-custom-fields.js",
  "dist/components/clockify-tags.js",
  "dist/components/clockify-billable.js",
  "dist/components/clockify-description.js",
];

let tempRoot;
let failed = false;

try {
  tempRoot = await mkdtemp(join(tmpdir(), "clockify-consumer-smoke-"));
  const packDir = join(tempRoot, "pack");
  const appDir = join(tempRoot, "consumer-app");

  await mkdir(packDir, { recursive: true });
  await mkdir(join(appDir, "src"), { recursive: true });

  const packResult = await run(npmCommand, ["pack", "--pack-destination", packDir, "--json"], {
    cwd: repoRoot,
    capture: true,
  });
  const [packInfo] = JSON.parse(packResult.stdout);
  const tarballPath = isAbsolute(packInfo.filename) ? packInfo.filename : join(packDir, packInfo.filename);

  assertRequiredPackageFiles(packInfo.files ?? []);

  await writeConsumerApp(appDir, tarballPath);

  await run(npmCommand, ["install", "--no-audit", "--no-fund", "--package-lock=false"], {
    cwd: appDir,
  });
  await run(process.execPath, [viteBin, "build"], { cwd: appDir });

  console.log("Consumer app smoke test passed.");
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
  if (tempRoot) {
    console.error(`Temporary consumer app retained at ${tempRoot}`);
  }
  process.exitCode = 1;
} finally {
  if (tempRoot && !failed && !keepTemp) {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function assertRequiredPackageFiles(files) {
  const publishedFiles = new Set(files.map((file) => file.path));
  const missingFiles = requiredPackageFiles.filter((file) => !publishedFiles.has(file));

  if (missingFiles.length > 0) {
    throw new Error(`Packed package is missing required files:\n${missingFiles.map((file) => `- ${file}`).join("\n")}`);
  }
}

async function writeConsumerApp(appDir, tarballPath) {
  const packageJson = {
    private: true,
    type: "module",
    dependencies: {
      "@marketplace/clockify-web-components": pathToFileURL(tarballPath).href,
    },
  };

  await writeFile(join(appDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(
    join(appDir, "vite.config.mjs"),
    `import { fileURLToPath } from "node:url";

export default {
  build: {
    rollupOptions: {
      input: {
        bundle: fileURLToPath(new URL("./index.html", import.meta.url)),
        singleComponents: fileURLToPath(new URL("./single-components.html", import.meta.url)),
      },
    },
  },
};
`
  );
  await writeFile(
    join(appDir, "index.html"),
    `<div id="app">
  <clockify-project-picker></clockify-project-picker>
  <clockify-tags></clockify-tags>
</div>
<script type="module" src="/src/full-bundle.js"></script>
`
  );
  await writeFile(
    join(appDir, "single-components.html"),
    `<div id="app">
  <clockify-select></clockify-select>
  <clockify-project-picker></clockify-project-picker>
  <clockify-custom-fields></clockify-custom-fields>
  <clockify-tags></clockify-tags>
  <clockify-billable></clockify-billable>
  <clockify-description></clockify-description>
</div>
<script type="module" src="/src/single-components.js"></script>
`
  );
  await writeFile(
    join(appDir, "src", "full-bundle.js"),
    `import "@marketplace/clockify-web-components/dist/style.css";
import { ClockifyWebComponentsApp } from "@marketplace/clockify-web-components";
import "@marketplace/clockify-web-components/dist/web-components.js";

window.ClockifyConsumerSmoke = {
  appInitAvailable: typeof ClockifyWebComponentsApp.init === "function",
};
`
  );
  await writeFile(
    join(appDir, "src", "single-components.js"),
    `import "@marketplace/clockify-web-components/dist/style.css";
import "@marketplace/clockify-web-components/dist/components/clockify-select.js";
import "@marketplace/clockify-web-components/dist/components/clockify-project-picker.js";
import "@marketplace/clockify-web-components/dist/components/clockify-custom-fields.js";
import "@marketplace/clockify-web-components/dist/components/clockify-tags.js";
import "@marketplace/clockify-web-components/dist/components/clockify-billable.js";
import "@marketplace/clockify-web-components/dist/components/clockify-description.js";
`
  );
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const renderedCommand = [command, ...args].join(" ");
      reject(new Error(`${renderedCommand} failed with exit code ${exitCode}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}