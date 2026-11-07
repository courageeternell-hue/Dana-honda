import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));
const errors = [];
const warnings = [];

const requiredFiles = [
  "app.json",
  "eas.json",
  "package.json",
  "package-lock.json",
  "assets/dana-honda-icon-square.png",
  "assets/dana-honda-icon.png",
  "app/_layout.tsx",
  "app/index.tsx",
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) errors.push(`File wajib tidak ditemukan: ${file}`);
}

if (Number(process.versions.node.split(".")[0]) < 22 ||
    (Number(process.versions.node.split(".")[0]) === 22 &&
     Number(process.versions.node.split(".")[1]) < 13)) {
  errors.push(`Gunakan Node.js 22.13 atau lebih baru. Versi sekarang: ${process.versions.node}`);
}

const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
const lockRoot = lock.packages?.[""];

if (app.owner !== "caturrrr") errors.push(`Expo owner harus caturrrr, sekarang: ${app.owner ?? "(kosong)"}`);
if (app.slug !== "wkwkwkw") errors.push(`Expo slug harus wkwkwkw, sekarang: ${app.slug ?? "(kosong)"}`);
if (app.extra?.eas?.projectId !== "7279aa93-83a0-4581-8bc4-af429a1d856b") {
  errors.push("EAS projectId tidak cocok dengan project caturrrr/wkwkwkw");
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(app.extra?.eas?.projectId ?? "")) {
  errors.push("EAS projectId belum valid di app.json");
}
if (!app.android?.package) errors.push("android.package belum diatur di app.json");
if (eas.build?.["production-apk"]?.android?.buildType !== "apk") errors.push("Profil production-apk harus menghasilkan APK");
if (eas.build?.production?.environment !== "production") errors.push("Profil production harus memakai environment production");

for (const section of ["dependencies", "devDependencies"]) {
  const expected = pkg[section] ?? {};
  const actual = lockRoot?.[section] ?? {};
  for (const [name, version] of Object.entries(expected)) {
    if (actual[name] !== version) errors.push(`package-lock tidak sinkron: ${section} ${name} (package.json: ${version}, lock: ${actual[name] ?? "tidak ada"})`);
  }
}

// EAS injects Production environment variables on the remote build worker.


console.log("Pemeriksaan awal Asisten Sales (Expo)");
console.log(`Expo account: ${app.owner}`);
console.log(`Expo slug: ${app.slug}`);
console.log(`EAS project: ${app.extra.eas.projectId}`);
console.log(`Android package: ${app.android.package}`);
console.log(`Production output: ${eas.build["production-apk"].android.buildType.toUpperCase()}`);

for (const warning of warnings) console.warn(`PERHATIAN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`GAGAL: ${error}`);
  process.exitCode = 1;
} else {
  console.log("LULUS: file, identitas Expo, profil APK, dan package-lock cocok.");
  console.log("Lanjutkan dengan npx expo-doctor dan npm run typecheck sebelum EAS build.");
}
