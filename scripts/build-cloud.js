const { execSync } = require("node:child_process");
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
  `Found ${functions.length} cloud functions: ${functions.join(", ")}`,
);

// 编译每个云函数
for (const fn of functions) {
  const fnDir = path.join(cloudFunctionsDir, fn);
  console.log(`\n🔨 Compiling ${fn}...`);
  try {
    execSync("npx tsc", { cwd: fnDir, stdio: "inherit" });
    console.log(`✅ ${fn} compiled`);
  } catch (error) {
    console.error(`❌ ${fn} failed`);
    process.exit(1);
  }
}

console.log("\n✅ All cloud functions compiled successfully!");
