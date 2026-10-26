// A small interpreter for the RewriteCond / RewriteRule lines of public/.htaccess, so the rules can be tested without Apache.
// It understands only what that file uses and stops with an error on anything else, so a new kind of rule cannot slip past the
// tests unchecked. It follows mod_rewrite's per-directory behaviour: the path is matched without its leading slash, the first
// rule that matches wins, and an internal rewrite starts the rules again with the new path.

export type Outcome =
  | { kind: "redirect"; status: number; location: string }
  | { kind: "file"; path: string }
  | { kind: "untouched" }
  | { kind: "none" };

export type Environment = {
  /** Paths (no leading slash) of the files the build wrote, like "product.html" or "_next/static/a.js". */
  files: ReadonlySet<string>;
  host?: string;
  /** Whether the request itself came in over https. */
  https?: boolean;
  forwardedProto?: string;
};

type Condition = { subject: string; test: string; flags: string };
type Rule = { pattern: string; target: string; flags: string; conditions: Condition[] };

export function parseRules(htaccess: string): Rule[] {
  const rules: Rule[] = [];
  let pending: Condition[] = [];

  for (const raw of htaccess.split(/\r?\n/)) {
    const line = raw.trim();
    const cond = line.match(/^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/);

    if (cond) {
      pending.push({ subject: cond[1], test: cond[2], flags: cond[3] ?? "" });
      continue;
    }

    const rule = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/);

    if (rule) {
      rules.push({ pattern: rule[1], target: rule[2], flags: rule[3] ?? "", conditions: pending });
      pending = [];
    }
  }

  return rules;
}

function expand(text: string, captures: string[], condCaptures: string[], env: Environment, path: string): string {
  return text
    .replace(/\$(\d)/g, (_, n) => captures[Number(n)] ?? "")
    .replace(/%(\d)/g, (_, n) => condCaptures[Number(n)] ?? "")
    .replace(/%\{HTTP_HOST\}/g, env.host ?? "anaizanest.com")
    .replace(/%\{REQUEST_URI\}/g, `/${path}`)
    .replace(/%\{DOCUMENT_ROOT\}\//g, "");
}

function passes(condition: Condition, captures: string[], env: Environment, path: string): { ok: boolean; groups: string[] } {
  const { subject, test, flags } = condition;
  const negate = test.startsWith("!");
  const pattern = negate ? test.slice(1) : test;
  const none: string[] = [];

  const result = (ok: boolean, groups = none) => ({ ok: negate ? !ok : ok, groups });

  if (pattern === "-f") {
    const file = subject.startsWith("%{DOCUMENT_ROOT}/")
      ? expand(subject, captures, [], env, path)
      : subject === "%{REQUEST_FILENAME}"
        ? path
        : subject === "%{REQUEST_FILENAME}.html"
          ? `${path}.html`
          : null;

    if (file === null) throw new Error(`Unsupported RewriteCond subject: ${subject}`);

    return result(env.files.has(file));
  }

  let value: string;
  if (subject === "%{HTTPS}") value = env.https ? "on" : "off";
  else if (subject === "%{HTTP:X-Forwarded-Proto}") value = env.forwardedProto ?? "";
  else if (subject === "%{REQUEST_URI}") value = `/${path}`;
  else if (subject === "%{HTTP_HOST}") value = env.host ?? "anaizanest.com";
  else throw new Error(`Unsupported RewriteCond subject: ${subject}`);

  const found = value.match(new RegExp(pattern.startsWith("^") || pattern.includes("\\") || /[()]/.test(pattern) ? pattern : `^${pattern}$`, flags.includes("NC") ? "i" : ""));

  return result(found !== null, found ? [...found] : none);
}

/** What the host does with a request for this address (path and optional query, the way a browser sends it). */
export function resolve(rules: Rule[], address: string, env: Environment): Outcome {
  const mark = address.indexOf("?");
  const rawPath = mark === -1 ? address : address.slice(0, mark);
  const rawQuery = mark === -1 ? "" : address.slice(mark + 1);
  let path = decodeURIComponent(rawPath.replace(/^\/+/, ""));
  let query = rawQuery;

  for (let pass = 0; pass < 10; pass++) {
    let restart = false;

    for (const rule of rules) {
      const match = path.match(new RegExp(rule.pattern, rule.flags.includes("NC") ? "i" : ""));
      if (!match) continue;

      let condCaptures: string[] = [];
      let allPass = true;

      for (const condition of rule.conditions) {
        const verdict = passes(condition, [...match], env, path);
        if (!verdict.ok) {
          allPass = false;
          break;
        }
        if (verdict.groups.length) condCaptures = verdict.groups;
      }

      if (!allPass) continue;

      if (rule.target === "-") return env.files.has(path) ? { kind: "file", path } : { kind: "untouched" };

      const target = expand(rule.target, [...match], condCaptures, env, path);
      const questionMark = target.indexOf("?");
      const targetPath = questionMark === -1 ? target : target.slice(0, questionMark);
      const nextQuery = questionMark === -1 ? query : target.slice(questionMark + 1);
      const redirect = rule.flags.match(/R(?:=(\d+))?/);

      if (redirect) {
        const location = /^https?:\/\//.test(targetPath) ? targetPath : targetPath;

        return { kind: "redirect", status: Number(redirect[1] ?? 302), location: nextQuery ? `${location}?${nextQuery}` : location };
      }

      path = targetPath.replace(/^\/+/, "");
      query = nextQuery;

      if (rule.flags.includes("L")) {
        restart = true;
        break;
      }
    }

    if (!restart) break;
  }

  return env.files.has(path) ? { kind: "file", path } : { kind: "none" };
}
