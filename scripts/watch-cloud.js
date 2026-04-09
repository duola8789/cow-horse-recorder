const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const cloudFunctionsDir = path.join(__dirname, "..", "cloudfunctions");

// 获取所有云函数目录
const functions = fs.readdirSync(cloudFunctionsDir).filter((name) => {
  const dir = path.join(cloudFunctionsDir, name);
  return (
    fs.statSync(dir).isDirectory() &&
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "index.ts"))
  );
});

console.log(
  `Watching ${functions.length} cloud functions: ${functions.join(", ")}\n`,
);

// 为每个云函数启动 tsc --watch
for (const fn of functions) {
  const fnDir = path.join(cloudFunctionsDir, fn);

  const tsc = spawn("npx", ["tsc", "--watch", "--preserveWatchOutput"], {
    cwd: fnDir,
    stdio: "pipe",
    shell: true,
  });

  tsc.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`[${fn}] ${line}`);
      }
    });
  });

  tsc.stderr.on("data", (data) => {
    console.error(`[${fn}] ${data}`);
  });

  tsc.on("close", (code) => {
    console.log(`[${fn}] exited with code ${code}`);
  });
}

console.log("Press Ctrl+C to stop watching.\n");
