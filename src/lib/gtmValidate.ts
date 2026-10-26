// A strict check of a Google Tag Manager export file (docs/gtm-container-anaizanest.json and docs/gtm/*.json), before anyone tries to import it.
//
// What it knows comes from the Tag Manager API's own resources (Tag, Trigger, Variable, Parameter, Condition, ConsentSetting) and from how GTM writes
// an export. It is a **strict** check: any key it does not know is reported as "stray", because GTM's importer refuses a file with fields it does
// not expect ("File format is invalid") and does not say which. It was NOT written against a failing import of this file (the real export of the empty
// container was not available when it was written): when docs/gtm-export-empty.json is present, the header is also compared with it.

export type Finding = { level: "error" | "warn"; where: string; message: string };

type Json = Record<string, unknown>;

const TAG_TYPES = ["googtag", "gaawe", "html"];
const TRIGGER_TYPES = ["CUSTOM_EVENT", "PAGEVIEW", "DOM_READY", "WINDOW_LOADED", "INIT", "CONSENT_INIT", "CLICK", "LINK_CLICK", "FORM_SUBMISSION", "HISTORY_CHANGE", "JS_ERROR", "TIMER", "SCROLL_DEPTH", "YOU_TUBE_VIDEO", "ELEMENT_VISIBILITY", "TRIGGER_GROUP"];
const VARIABLE_TYPES = ["v", "c", "jsm"];
const PARAMETER_TYPES = ["TEMPLATE", "INTEGER", "BOOLEAN", "LIST", "MAP", "TAG_REFERENCE", "TRIGGER_REFERENCE"];
const CONDITION_TYPES = ["EQUALS", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "MATCH_REGEX", "GREATER", "GREATER_OR_EQUALS", "LESS", "LESS_OR_EQUALS", "CSS_SELECTOR", "URL_MATCHES"];
const FIRING_OPTIONS = ["ONCE_PER_EVENT", "ONCE_PER_LOAD", "UNLIMITED"];
const CONSENT_STATUS = ["NOT_SET", "NOT_NEEDED", "NEEDED"];
const BUILT_IN_TYPES = ["EVENT", "PAGE_URL", "PAGE_HOSTNAME", "PAGE_PATH", "REFERRER", "CLICK_ELEMENT", "CLICK_CLASSES", "CLICK_ID", "CLICK_TARGET", "CLICK_URL", "CLICK_TEXT", "FORM_ELEMENT", "ERROR_MESSAGE", "RANDOM_NUMBER", "CONTAINER_ID", "CONTAINER_VERSION", "ENVIRONMENT_NAME", "DEBUG_MODE", "HTML_ID"];
/** Names a {{reference}} may use without a variable of its own in the file. */
const BUILT_IN_REFERENCES = ["_event", "Event", "Page URL", "Page Hostname", "Page Path", "Referrer"];

const KEYS = {
  file: { required: ["exportFormatVersion", "exportTime", "containerVersion"], optional: [] },
  containerVersion: {
    required: ["path", "accountId", "containerId", "containerVersionId", "container", "tag", "trigger", "variable", "builtInVariable", "fingerprint", "tagManagerUrl"],
    optional: ["name", "description", "folder", "client", "zone", "customTemplate", "transformation", "deleted", "gtagConfig"],
  },
  container: {
    required: ["path", "accountId", "containerId", "name", "publicId", "usageContext", "fingerprint", "tagManagerUrl"],
    optional: ["features", "tagIds", "notes", "domainName", "taggingServerUrls", "tagManagerUrl"],
  },
  tag: {
    required: ["accountId", "containerId", "tagId", "name", "type", "parameter", "fingerprint", "firingTriggerId", "tagFiringOption", "monitoringMetadata", "consentSettings"],
    optional: ["blockingTriggerId", "parentFolderId", "paused", "priority", "setupTag", "teardownTag", "notes", "scheduleStartMs", "scheduleEndMs", "liveOnly", "monitoringMetadataTagNameKey", "tagManagerUrl", "path"],
  },
  trigger: {
    required: ["accountId", "containerId", "triggerId", "name", "type", "fingerprint"],
    optional: ["customEventFilter", "filter", "autoEventFilter", "parameter", "notes", "parentFolderId", "uniqueTriggerId", "waitForTags", "checkValidation", "waitForTagsTimeout", "tagManagerUrl", "path"],
  },
  variable: {
    required: ["accountId", "containerId", "variableId", "name", "type", "parameter", "fingerprint"],
    optional: ["formatValue", "notes", "parentFolderId", "disablingTriggerId", "enablingTriggerId", "scheduleStartMs", "scheduleEndMs", "tagManagerUrl", "path"],
  },
  builtInVariable: { required: ["accountId", "containerId", "type", "name"], optional: ["path"] },
} as const;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const keysOf = (value: Json) => Object.keys(value);

function checkKeys(value: Json, shape: { required: readonly string[]; optional: readonly string[] }, where: string, findings: Finding[]) {
  for (const key of shape.required) if (!(key in value)) findings.push({ level: "error", where, message: `missing field "${key}"` });
  for (const key of keysOf(value)) if (!shape.required.includes(key) && !shape.optional.includes(key)) findings.push({ level: "error", where, message: `stray field "${key}" (GTM's importer does not know it)` });
}

function checkParameter(parameter: unknown, where: string, findings: Finding[]) {
  if (!isObject(parameter)) return void findings.push({ level: "error", where, message: "a parameter is not an object" });

  const type = parameter.type;
  if (typeof type !== "string" || !PARAMETER_TYPES.includes(type)) return void findings.push({ level: "error", where, message: `parameter type "${String(type)}" is not one of ${PARAMETER_TYPES.join(", ")}` });
  if (typeof parameter.key !== "string" || parameter.key === "") findings.push({ level: "error", where, message: "a parameter has no key" });

  const label = `${where} parameter "${String(parameter.key)}"`;
  const allowed = type === "LIST" ? ["type", "key", "list"] : type === "MAP" ? ["type", "key", "map"] : ["type", "key", "value"];
  for (const key of keysOf(parameter)) if (!allowed.includes(key) && key !== "isWeakReference") findings.push({ level: "error", where: label, message: `stray field "${key}" in a ${type} parameter` });

  if (type === "LIST") {
    if (!Array.isArray(parameter.list)) return void findings.push({ level: "error", where: label, message: "a LIST parameter needs a list" });
    for (const row of parameter.list) {
      if (!isObject(row)) findings.push({ level: "error", where: label, message: "a list entry is not an object" });
      else if (row.type === "MAP") (Array.isArray(row.map) ? row.map : []).forEach((cell) => checkParameter(cell, `${label} map`, findings));
      else if (row.type !== "TEMPLATE" || typeof row.value !== "string") findings.push({ level: "error", where: label, message: "a list entry is neither a MAP nor a TEMPLATE with a value" });
    }
    return;
  }

  if (type === "MAP") return void (Array.isArray(parameter.map) ? parameter.map : []).forEach((cell) => checkParameter(cell, label, findings));

  const value = parameter.value;
  if (typeof value !== "string") return void findings.push({ level: "error", where: label, message: `the value of a ${type} parameter must be text (GTM writes numbers and true/false as text)` });
  if (type === "BOOLEAN" && value !== "true" && value !== "false") findings.push({ level: "error", where: label, message: `BOOLEAN value "${value}" is not "true" or "false"` });
  if (type === "INTEGER" && !/^-?\d+$/.test(value)) findings.push({ level: "error", where: label, message: `INTEGER value "${value}" is not whole digits` });
  if ((type === "TAG_REFERENCE" || type === "TRIGGER_REFERENCE") && value === "") findings.push({ level: "error", where: label, message: "a reference with no name" });
  if (type === "TEMPLATE" && value === "") findings.push({ level: "warn", where: label, message: "an empty text value (GTM does not keep an empty constant; check it imports)" });
}

function checkCondition(condition: unknown, where: string, findings: Finding[]) {
  if (!isObject(condition)) return void findings.push({ level: "error", where, message: "a condition is not an object" });
  if (typeof condition.type !== "string" || !CONDITION_TYPES.includes(condition.type)) findings.push({ level: "error", where, message: `condition type "${String(condition.type)}" is not one of ${CONDITION_TYPES.join(", ")}` });
  for (const key of keysOf(condition)) if (key !== "type" && key !== "parameter") findings.push({ level: "error", where, message: `stray field "${key}" in a condition` });
  const parameters = Array.isArray(condition.parameter) ? condition.parameter : [];
  const keys = parameters.map((parameter) => (isObject(parameter) ? parameter.key : null));
  if (keys[0] !== "arg0" || keys[1] !== "arg1") findings.push({ level: "error", where, message: "a condition needs the parameters arg0 and arg1, in that order" });
  parameters.forEach((parameter) => checkParameter(parameter, where, findings));
}

function checkConsent(consent: unknown, where: string, findings: Finding[]) {
  if (!isObject(consent)) return void findings.push({ level: "error", where, message: "consentSettings is not an object" });
  for (const key of keysOf(consent)) if (key !== "consentStatus" && key !== "consentType") findings.push({ level: "error", where, message: `stray field "${key}" in consentSettings` });
  if (typeof consent.consentStatus !== "string" || !CONSENT_STATUS.includes(consent.consentStatus)) return void findings.push({ level: "error", where, message: `consentStatus must be ${CONSENT_STATUS.join(", ")}` });

  if (consent.consentStatus === "NEEDED") {
    const type = consent.consentType;
    const ok = isObject(type) && type.type === "LIST" && Array.isArray(type.list) && type.list.length > 0 && type.list.every((entry) => isObject(entry) && entry.type === "TEMPLATE" && typeof entry.value === "string" && /^[a-z_]+$/.test(entry.value));
    if (!ok) findings.push({ level: "error", where, message: 'a NEEDED consent must carry consentType {"type":"LIST","list":[{"type":"TEMPLATE","value":"ad_storage"}]}' });
  } else if ("consentType" in consent) {
    findings.push({ level: "error", where, message: "consentType only goes with consentStatus NEEDED" });
  }
}

function strings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => strings(entry, found));
  else if (isObject(value)) Object.values(value).forEach((entry) => strings(entry, found));

  return found;
}

export type ValidateOptions = {
  /** Variable names that are defined in another file (a part of the container is checked on its own). */
  externalVariables?: string[];
  /** The real export of the container, to compare the header and the shapes with. */
  reference?: Json | null;
  /** Accept the container's own template types (cvt_..., awec) and custom templates: for checking a real export itself. */
  allowForeignTypes?: boolean;
};

function shapeOf(value: Json): string {
  return keysOf(value).join(",");
}

function walkParameters(parameters: unknown, visit: (parameter: Json) => void) {
  for (const parameter of Array.isArray(parameters) ? parameters : []) {
    if (!isObject(parameter)) continue;
    visit(parameter);
    if (Array.isArray(parameter.list)) for (const row of parameter.list) if (isObject(row)) { visit(row); walkParameters(row.map, visit); }
  }
}

/** The key sets (in GTM's order) found in a real export, for each kind of object. */
export function observedShapes(reference: Json): Record<string, Set<string>> {
  const shapes: Record<string, Set<string>> = { tag: new Set(), trigger: new Set(), variable: new Set(), builtInVariable: new Set(), parameter: new Set(), condition: new Set(), consent: new Set() };
  const version = isObject(reference.containerVersion) ? reference.containerVersion : {};
  for (const kind of ["tag", "trigger", "variable", "builtInVariable"] as const) for (const item of Array.isArray(version[kind]) ? (version[kind] as unknown[]) : []) if (isObject(item)) {
    shapes[kind].add(shapeOf(item));
    walkParameters(item.parameter, (parameter) => shapes.parameter.add(shapeOf(parameter)));
    if (isObject(item.consentSettings)) shapes.consent.add(shapeOf(item.consentSettings));
    for (const key of ["customEventFilter", "filter"]) for (const condition of Array.isArray(item[key]) ? (item[key] as unknown[]) : []) if (isObject(condition)) shapes.condition.add(shapeOf(condition));
  }

  return shapes;
}

export function validateExport(file: unknown, options: ValidateOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const add = (level: Finding["level"], where: string, message: string) => findings.push({ level, where, message });

  if (!isObject(file)) return [{ level: "error", where: "file", message: "not a JSON object" }];
  checkKeys(file, KEYS.file, "file", findings);
  if (file.exportFormatVersion !== 2) add("error", "file", `exportFormatVersion must be the number 2 (is ${JSON.stringify(file.exportFormatVersion)})`);
  if (typeof file.exportTime !== "string" || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(file.exportTime)) add("error", "file", `exportTime must look like "2026-10-27 09:00:00" (is ${JSON.stringify(file.exportTime)})`);

  const version = file.containerVersion;
  if (!isObject(version)) return [...findings, { level: "error", where: "file", message: "containerVersion is missing or not an object" }];
  checkKeys(version, { required: KEYS.containerVersion.required, optional: options.allowForeignTypes ? [...KEYS.containerVersion.optional, "customTemplate"] : KEYS.containerVersion.optional }, "containerVersion", findings);

  const accountId = version.accountId;
  const containerId = version.containerId;
  for (const [name, id] of [["accountId", accountId], ["containerId", containerId], ["containerVersionId", version.containerVersionId]] as const) {
    if (typeof id !== "string" || !/^\d+$/.test(id)) add("error", "containerVersion", `${name} must be a string of digits (is ${JSON.stringify(id)})`);
  }
  if (accountId === "0" || containerId === "0") add("warn", "containerVersion", 'accountId / containerId are the placeholder "0": copy the real ones from an export of the empty container (docs/gtm-export-empty.json)');

  const container = version.container;
  if (isObject(container)) {
    checkKeys(container, KEYS.container, "container", findings);
    if (container.accountId !== accountId || container.containerId !== containerId) add("error", "container", "accountId / containerId differ from the containerVersion's");
    if (!Array.isArray(container.usageContext) || container.usageContext.join() !== "WEB") add("error", "container", 'usageContext must be ["WEB"] for a web container');
    if (typeof container.publicId !== "string" || !/^GTM-[A-Z0-9]+$/.test(container.publicId)) add("error", "container", "publicId must look like GTM-XXXXXXX");
    if (!("features" in container)) add("warn", "container", 'no "features" block (real exports have one)');
  } else add("error", "containerVersion", "container is missing");

  const lists = { tag: version.tag, trigger: version.trigger, variable: version.variable, builtInVariable: version.builtInVariable };
  for (const [kind, list] of Object.entries(lists)) if (!Array.isArray(list)) add("error", "containerVersion", `${kind} must be a list (an empty one is []) `);

  const tags = (Array.isArray(lists.tag) ? lists.tag : []).filter(isObject);
  const triggers = (Array.isArray(lists.trigger) ? lists.trigger : []).filter(isObject);
  const variables = (Array.isArray(lists.variable) ? lists.variable : []).filter(isObject);
  const builtIns = (Array.isArray(lists.builtInVariable) ? lists.builtInVariable : []).filter(isObject);

  // Ids: digits in text, unique within their kind, and the same account and container everywhere.
  const idKeys = { tag: "tagId", trigger: "triggerId", variable: "variableId" } as const;
  for (const [kind, list] of [["tag", tags], ["trigger", triggers], ["variable", variables]] as const) {
    const seen = new Set<string>();
    for (const item of list) {
      const id = item[idKeys[kind]];
      const where = `${kind} "${String(item.name)}"`;
      if (typeof id !== "string" || !/^\d+$/.test(id)) add("error", where, `${idKeys[kind]} must be a string of digits (is ${JSON.stringify(id)})`);
      else if (seen.has(id)) add("error", where, `${idKeys[kind]} ${id} is used twice`);
      else seen.add(id);
      if (item.accountId !== accountId || item.containerId !== containerId) add("error", where, "accountId / containerId differ from the container's");
      if (typeof item.fingerprint !== "string" || !/^\d+$/.test(item.fingerprint)) add("warn", where, `fingerprint ${JSON.stringify(item.fingerprint)} is not digits in text (GTM writes a number of milliseconds)`);
    }
    const names = list.map((item) => item.name);
    if (new Set(names).size !== names.length) add("error", kind, "two items share a name");
  }

  const variableNames = new Set([...variables.map((variable) => String(variable.name)), ...BUILT_IN_REFERENCES, ...(options.externalVariables ?? [])]);
  const triggerIds = new Set([...triggers.map((trigger) => String(trigger.triggerId)), "2147479553", "2147479573", "2147479572"]);

  for (const variable of variables) {
    const where = `variable "${String(variable.name)}"`;
    checkKeys(variable, KEYS.variable, where, findings);
    if (typeof variable.type !== "string" || !(VARIABLE_TYPES.includes(variable.type) || (options.allowForeignTypes && /^(cvt_[A-Za-z0-9_]+|awec)$/.test(variable.type)))) add("error", where, `type "${String(variable.type)}" is not one of ${VARIABLE_TYPES.join(", ")}`);
    (Array.isArray(variable.parameter) ? variable.parameter : []).forEach((parameter) => checkParameter(parameter, where, findings));
    if ("formatValue" in variable && !isObject(variable.formatValue)) add("error", where, "formatValue must be an object");
    const parameters = (Array.isArray(variable.parameter) ? variable.parameter : []).filter(isObject);
    const get = (key: string) => parameters.find((parameter) => parameter.key === key);
    if (variable.type === "v") {
      const expected = ["dataLayerVersion", "setDefaultValue", "name"];
      if (parameters.map((parameter) => parameter.key).join() !== expected.join()) add("error", where, `a Data Layer variable has the parameters ${expected.join(", ")} (has ${parameters.map((parameter) => String(parameter.key)).join(", ")})`);
      if (get("dataLayerVersion")?.value !== "2") add("warn", where, "dataLayerVersion is not 2");
    }
    if (variable.type === "c" && (parameters.length !== 1 || parameters[0].key !== "value")) add("error", where, 'a Constant has exactly one parameter, "value"');
    if (variable.type === "jsm") {
      if (parameters.length !== 1 || parameters[0].key !== "javascript") add("error", where, 'a Custom JavaScript variable has exactly one parameter, "javascript"');
      const code = String(get("javascript")?.value ?? "");
      if (!/^function\s*\(/.test(code.trim())) add("error", where, "the code must be one anonymous function");
      if (/=>|\blet\b|\bconst\b|`|\.\.\./.test(code)) add("error", where, "Custom JavaScript variables must be ES5 (no arrow functions, let, const, template strings or spread)");
    }
  }

  for (const trigger of triggers) {
    const where = `trigger "${String(trigger.name)}"`;
    checkKeys(trigger, KEYS.trigger, where, findings);
    if (typeof trigger.type !== "string" || !TRIGGER_TYPES.includes(trigger.type)) add("error", where, `type "${String(trigger.type)}" is not a trigger type GTM has`);
    if (trigger.type === "CUSTOM_EVENT" && !Array.isArray(trigger.customEventFilter)) add("error", where, "a Custom Event trigger needs customEventFilter");
    for (const key of ["customEventFilter", "filter"] as const) {
      if (key in trigger) {
        if (!Array.isArray(trigger[key])) add("error", where, `${key} must be a list`);
        else (trigger[key] as unknown[]).forEach((condition) => checkCondition(condition, where, findings));
      }
    }
  }

  for (const tag of tags) {
    const where = `tag "${String(tag.name)}"`;
    checkKeys(tag, KEYS.tag, where, findings);
    if (typeof tag.type !== "string" || !(TAG_TYPES.includes(tag.type) || (options.allowForeignTypes && /^cvt_[A-Za-z0-9_]+$/.test(tag.type)))) add("error", where, `type "${String(tag.type)}" is not one of ${TAG_TYPES.join(", ")}`);
    (Array.isArray(tag.parameter) ? tag.parameter : []).forEach((parameter) => checkParameter(parameter, where, findings));
    if (!Array.isArray(tag.firingTriggerId) || tag.firingTriggerId.length === 0) add("error", where, "firingTriggerId must be a list with at least one trigger id (as text)");
    else for (const id of tag.firingTriggerId) {
      if (typeof id !== "string") add("error", where, `trigger id ${JSON.stringify(id)} must be text`);
      else if (!triggerIds.has(id)) add("error", where, `fires on trigger ${id}, which is not in the file (and is not a built-in trigger)`);
    }
    if (typeof tag.tagFiringOption !== "string" || !FIRING_OPTIONS.includes(tag.tagFiringOption)) add("error", where, `tagFiringOption must be one of ${FIRING_OPTIONS.join(", ")}`);
    if (!isObject(tag.monitoringMetadata) || tag.monitoringMetadata.type !== "MAP" || keysOf(tag.monitoringMetadata).length !== 1) add("error", where, 'monitoringMetadata must be {"type":"MAP"}');
    checkConsent(tag.consentSettings, where, findings);

    const keys = (Array.isArray(tag.parameter) ? tag.parameter : []).filter(isObject).map((parameter) => String(parameter.key));
    const need: Record<string, string[]> = { html: ["html", "supportDocumentWrite"], googtag: ["tagId"], gaawe: ["eventName", "measurementIdOverride"] };
    for (const key of need[String(tag.type)] ?? []) if (!keys.includes(key)) add("error", where, `a ${String(tag.type)} tag needs the parameter "${key}"`);
    if (tag.type === "html") {
      const html = String((Array.isArray(tag.parameter) ? tag.parameter : []).filter(isObject).find((parameter) => parameter.key === "html")?.value ?? "");
      if (!/^<script>[\s\S]*<\/script>$/.test(html.trim())) add("error", where, "the html must be one <script>...</script> block");
      if (html.length > 20000) add("warn", where, `the code is ${html.length} characters long`);
      if (tag.consentSettings && isObject(tag.consentSettings) && tag.consentSettings.consentStatus !== "NEEDED") add("warn", where, "a Custom HTML tag with no consent requirement fires whatever the visitor chose");
    }
  }

  for (const builtIn of builtIns) {
    const where = `built-in variable "${String(builtIn.name)}"`;
    checkKeys(builtIn, KEYS.builtInVariable, where, findings);
    if (typeof builtIn.type !== "string" || !BUILT_IN_TYPES.includes(builtIn.type)) add("error", where, `type "${String(builtIn.type)}" is not a built-in variable GTM has`);
    if (builtIn.accountId !== accountId || builtIn.containerId !== containerId) add("error", where, "accountId / containerId differ from the container's");
  }

  // Every {{name}} in the file names a variable.
  for (const text of strings([tags, triggers, variables])) {
    for (const match of text.matchAll(/\{\{([^}]*)\}\}/g)) {
      if (!variableNames.has(match[1])) add("error", "references", `{{${match[1]}}} is not a variable of the file, a built-in one, or one the file is told to expect elsewhere`);
    }
  }

  // Unusual, not wrong.
  for (const item of [...tags, ...triggers, ...variables]) {
    const name = String(item.name);
    if (!/^[A-Za-z0-9 ()+.&_\-:]+$/.test(name)) add("warn", `"${name}"`, "the name has an unusual character");
    if (name.length > 100) add("warn", `"${name}"`, "a very long name");
  }
  for (const variable of variables) {
    if (variable.type === "c" && isObject(variable) && (variable.parameter as { value?: string }[])[0]?.value?.startsWith("REPLACE")) add("warn", `variable "${String(variable.name)}"`, "still holds a placeholder to replace after import");
  }

  // Against the real export of the empty container, when there is one.
  const reference = options.reference;
  if (reference && isObject(reference) && isObject(reference.containerVersion)) {
    const ref = reference.containerVersion;
    const headerKeys = (value: Json) => keysOf(value).filter((key) => !["tag", "trigger", "variable", "builtInVariable", "folder", "customTemplate", "client", "zone", "transformation"].includes(key));
    if (headerKeys(version).join() !== headerKeys(ref).join()) add("error", "header", `containerVersion keys differ from the real export: ${headerKeys(version).join(", ")} vs ${headerKeys(ref).join(", ")}`);
    for (const key of ["accountId", "containerId", "path"]) if (version[key] !== ref[key]) add("error", "header", `${key} ${JSON.stringify(version[key])} differs from the real export's ${JSON.stringify(ref[key])}`);
    if (isObject(container) && isObject(ref.container)) {
      if (keysOf(container).join() !== keysOf(ref.container).join()) add("error", "header", `container keys differ from the real export: ${keysOf(container).join(", ")} vs ${keysOf(ref.container).join(", ")}`);
      for (const key of ["name", "publicId", "usageContext", "tagManagerUrl", "features", "tagIds"]) if (JSON.stringify(container[key]) !== JSON.stringify(ref.container[key])) add("error", "header", `container.${key} differs from the real export`);
    }
    if (keysOf(file).join() !== keysOf(reference).join()) add("error", "header", "the top-level keys differ from the real export's");

    // Every object's keys, in order, against the shapes GTM itself wrote in the real export. A shape it has not written there is not
    // necessarily wrong (it may be valid and simply unused in that container), so it is reported as unusual.
    const seen = observedShapes(reference);
    const unseen = (kind: string, value: Json, label: string) => {
      if (seen[kind].size > 0 && !seen[kind].has(shapeOf(value))) add("warn", label, `its fields (${shapeOf(value)}) are not a ${kind} shape found in the real export`);
    };
    for (const [kind, list] of [["tag", tags], ["trigger", triggers], ["variable", variables], ["builtInVariable", builtIns]] as const) {
      for (const item of list) {
        unseen(kind, item, `${kind} "${String(item.name)}"`);
        walkParameters(item.parameter, (parameter) => unseen("parameter", parameter, `${kind} "${String(item.name)}" parameter "${String(parameter.key)}"`));
        if (isObject(item.consentSettings)) unseen("consent", item.consentSettings, `${kind} "${String(item.name)}" consentSettings`);
        for (const key of ["customEventFilter", "filter"]) for (const condition of Array.isArray(item[key]) ? (item[key] as unknown[]) : []) if (isObject(condition)) unseen("condition", condition, `${kind} "${String(item.name)}" ${key}`);
      }
    }
  }

  return findings;
}
