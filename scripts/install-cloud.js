const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const cloudFunctionsDir = path.join(__dirname, "..", "cloudfunctions");

// 获取所有云函数目录
const functions = fs.readdirSync(cloudFunctionsDir).filter((name) => {
  const dir = path.join(cloudFunctionsDir, name);
  return (
    fs.statSync(dir).isDirectory() &&
    fs.existsSync(path.join(dir, "package.json"))
  );
});

console.log(
  `Found ${functions.length} cloud functions: ${functions.join(", ")}`,
);

// 安装每个云函数的依赖
for (const fn of functions) {
  const fnDir = path.join(cloudFunctionsDir, fn);
  console.log(`\n📦 Installing dependencies for ${fn}...`);
  try {
    execSync("npm install", { cwd: fnDir, stdio: "inherit" });
    console.log(`✅ ${fn} done`);
  } catch (error) {
    console.error(`❌ ${fn} failed:`, error.message);
    process.exit(1);
  }
}

console.log("\n✅ All cloud functions installed successfully!");
