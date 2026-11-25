// post-x-promote-make-your-own-bounty-01 — post composer & validator.
//
// A real, useful program for this make.fun entry: it holds the exact X post
// draft for the "Promote make.fun's make-your-own-bounty post on X" bounty,
// validates it against every rule of the competition, checks the attached
// photo, and writes a validation report (post-validated.json).
//
// Node 22.18+ (type stripping), standard library only, no network access.
// Run:  node main.ts        (exit 0 when the post is valid, 1 otherwise)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Entry facts (single source of truth — the post, the bounty, the account)
// ---------------------------------------------------------------------------

const BOUNTY_SLUG = "post-x-promote-make-your-own-bounty-01";
const BOUNTY_URL = `https://make.fun/bounty/${BOUNTY_SLUG}`;
const ACCOUNT = "@dentybaiq";
const PLAY_CODE = "hvjtrkxx";
const QUOTED_POST_URL = "https://x.com/makefunai/status/2124915864336236646";
const SPONSOR_URL = "https://make.fun/sponsor/new";
const SPONSOR_LINE =
  "Make your own bounty on @makefunai: https://make.fun/sponsor/new";
const PHOTO_FILE = "post-photo.png";
const MAX_CHARS = 280;
// X counts every URL as 23 characters (t.co wrapping), whatever its real length.
const X_URL_WEIGHT = 23;

// The exact post text, as it will be published (quote-post of QUOTED_POST_URL,
// with PHOTO_FILE attached). Original engagement question — not copied from
// any other entrant.
const POST_DRAFT = [
  "If you could put a bounty on ANYTHING — a bug, a game, a song, a wild idea — what would it be? Reply below 👇",
  SPONSOR_LINE,
  `Play code: ${PLAY_CODE}`,
].join("\n");

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Severity = "required" | "warning";

interface Check {
  id: string;
  label: string;
  severity: Severity;
  passed: boolean;
  detail: string;
}

interface PostJson {
  post_url?: string;
  account?: string;
  quoted_post_url?: string;
  [key: string]: unknown;
}

function xWeightedLength(text: string): number {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  let len = text.length;
  for (const u of urls) len += X_URL_WEIGHT - u.length;
  return len;
}

function readPostJson(): PostJson | null {
  const path = join(DIR, "POST.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PostJson;
  } catch {
    return null;
  }
}

interface PngInfo {
  valid: boolean;
  width: number;
  height: number;
  bytes: number;
  detail: string;
}

// Minimal PNG check, no dependencies: signature + IHDR width/height.
function inspectPng(path: string): PngInfo {
  if (!existsSync(path)) {
    return { valid: false, width: 0, height: 0, bytes: 0, detail: "file missing" };
  }
  const buf = readFileSync(path);
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    return { valid: false, width: 0, height: 0, bytes: buf.length, detail: "not a PNG" };
  }
  if (buf.toString("ascii", 12, 16) !== "IHDR") {
    return { valid: false, width: 0, height: 0, bytes: buf.length, detail: "no IHDR chunk" };
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { valid: true, width, height, bytes: buf.length, detail: `${width}x${height}, ${buf.length} bytes` };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, passed: boolean, detail: string, severity: Severity = "required") =>
    checks.push({ id, label, severity, passed, detail });

  // --- the draft itself ---
  add("draft-nonempty", "Post draft is non-empty", POST_DRAFT.trim().length > 0, `${POST_DRAFT.length} raw chars`);
  add(
    "raw-length",
    `Raw length within ${MAX_CHARS} characters`,
    POST_DRAFT.length <= MAX_CHARS,
    `${POST_DRAFT.length}/${MAX_CHARS} chars`,
  );
  const weighted = xWeightedLength(POST_DRAFT);
  add(
    "x-weighted-length",
    `X-weighted length within ${MAX_CHARS} (URLs count as ${X_URL_WEIGHT})`,
    weighted <= MAX_CHARS,
    `${weighted}/${MAX_CHARS} chars`,
  );
  add("tag-makefunai", "Tags @makefunai", POST_DRAFT.includes("@makefunai"), "found in draft");
  add("link-makefun", "Links to make.fun", POST_DRAFT.includes("make.fun"), "found in draft");
  add(
    "sponsor-line",
    "Contains the exact sponsor line",
    POST_DRAFT.includes(SPONSOR_LINE),
    JSON.stringify(SPONSOR_LINE),
  );
  add("play-code", `Includes play code ${PLAY_CODE}`, POST_DRAFT.includes(PLAY_CODE), `code: ${PLAY_CODE}`);
  add(
    "play-code-format",
    "Play code is well-formed (lowercase alphanumerics)",
    /^[a-z0-9]{6,12}$/.test(PLAY_CODE),
    PLAY_CODE,
  );
  add(
    "engagement-question",
    "Asks an original reply-inviting question",
    POST_DRAFT.includes("?") && /reply below/i.test(POST_DRAFT),
    "question mark + explicit reply invitation present",
  );
  add(
    "not-a-reply",
    "Post is a standalone post, not a reply (does not start with @)",
    !POST_DRAFT.trimStart().startsWith("@"),
    "starts with normal text",
  );
  const urls = POST_DRAFT.match(/https?:\/\/\S+/g) ?? [];
  add(
    "single-link",
    "Exactly one link in the text (the sponsor link — no link spam)",
    urls.length === 1 && urls[0] === SPONSOR_URL,
    `links: ${urls.join(", ") || "none"}`,
  );

  // --- POST.json cross-checks ---
  const meta = readPostJson();
  if (meta === null) {
    add("post-json", "POST.json exists and parses", false, "POST.json missing or invalid JSON");
  } else {
    add("post-json", "POST.json exists and parses", true, "parsed OK");
    add(
      "quoted-post",
      "POST.json names the make.fun post being quoted",
      meta.quoted_post_url === QUOTED_POST_URL,
      `quoted_post_url: ${meta.quoted_post_url ?? "(missing)"}`,
    );
    add(
      "account",
      `POST.json names the posting account ${ACCOUNT}`,
      meta.account === ACCOUNT,
      `account: ${meta.account ?? "(missing)"}`,
    );
    const url = meta.post_url ?? "";
    if (url.startsWith("TBD")) {
      add(
        "post-url",
        "post_url filled in after the X post is published",
        true,
        "still TBD — the X post has not been published yet; update POST.json after publishing",
        "warning",
      );
    } else {
      add(
        "post-url",
        "post_url is the published X post",
        /^https:\/\/(x\.com|twitter\.com)\/dentybaiq\/status\/\d+$/.test(url),
        `post_url: ${url}`,
      );
    }
  }

  // --- attached photo ---
  const photoPath = join(DIR, PHOTO_FILE);
  const png = inspectPng(photoPath);
  add("photo-exists", `Photo ${PHOTO_FILE} exists and is a valid PNG`, png.valid, png.detail);
  if (png.valid) {
    add(
      "photo-size",
      "Photo within X limits (under 5 MB, at most 4096 px per side)",
      png.bytes < 5 * 1024 * 1024 && png.width <= 4096 && png.height <= 4096,
      png.detail,
    );
    add(
      "photo-shape",
      "Photo is a wide 16:9 promo image",
      Math.abs(png.width / png.height - 16 / 9) < 0.05,
      `${png.width}x${png.height}`,
    );
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function main(): void {
  const checks = validate();
  const failedRequired = checks.filter((c) => c.severity === "required" && !c.passed);
  const warnings = checks.filter((c) => c.severity === "warning" && !c.passed);
  const pendingWarnings = checks.filter((c) => c.severity === "warning" && c.passed);
  const valid = failedRequired.length === 0;

  const report = {
    bounty: BOUNTY_SLUG,
    bounty_url: BOUNTY_URL,
    account: ACCOUNT,
    play_code: PLAY_CODE,
    quoted_post_url: QUOTED_POST_URL,
    photo: PHOTO_FILE,
    post: POST_DRAFT,
    raw_chars: POST_DRAFT.length,
    x_weighted_chars: xWeightedLength(POST_DRAFT),
    max_chars: MAX_CHARS,
    valid,
    warnings: [...warnings, ...pendingWarnings].map((c) => `${c.id}: ${c.detail}`),
    checks,
    generated_at: new Date().toISOString(),
  };

  writeFileSync(join(DIR, "post-validated.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`make.fun bounty: ${BOUNTY_SLUG}`);
  console.log(`account: ${ACCOUNT}   play code: ${PLAY_CODE}`);
  console.log(`photo: ${PHOTO_FILE}`);
  console.log("--- post draft ---");
  console.log(POST_DRAFT);
  console.log(`--- (${POST_DRAFT.length} raw chars, ${xWeightedLength(POST_DRAFT)} X-weighted, limit ${MAX_CHARS}) ---`);
  for (const c of checks) {
    const mark = c.passed ? "PASS" : c.severity === "warning" ? "WARN" : "FAIL";
    console.log(`[${mark}] ${c.id}: ${c.label} — ${c.detail}`);
  }
  if (valid) {
    console.log(`\nVALID${pendingWarnings.length > 0 ? " (with pending-publication warning — update POST.json post_url after the X post goes live)" : ""}. Report written to post-validated.json`);
  } else {
    console.error(`\nINVALID: ${failedRequired.length} required check(s) failed. Report written to post-validated.json`);
    process.exit(1);
  }
}

main();
