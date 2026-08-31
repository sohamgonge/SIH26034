import ruleset from "@/data/legal-metrology-rules.json";

const deferredToPackRegex =
  /\bsee\s+(?:under|on|inside|at)?\s*(?:the)?\s*(?:seal|cap|lid|pack(?:et)?|base|bottom|carton|pouch|tube|crimp)\b|\bembossed\b|\bprinted\s+separately\b|\blaser\s*coded?\b/i;

function deferredNote(kind) {
  return `Label carries the required ${kind} wording, but the actual value appears to be printed elsewhere on the physical pack. This needs a physical inspection.`;
}

function checkPresence(value) {
  const passed = value !== null && value !== undefined && String(value).trim() !== "";
  return [passed, null];
}

function checkPresenceWithPincode(value, rule) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [false, "Address field empty"];
  }

  const pattern = new RegExp(rule.pincode_regex || "\\b\\d{6}\\b");
  const hasPincode = pattern.test(String(value));
  return [hasPincode, hasPincode ? null : "No 6-digit PIN code found in address"];
}

function checkFormatRegex(value, rule) {
  if (value === null || value === undefined) {
    return [false, "Field missing"];
  }

  const text = String(value);
  const passed = new RegExp(rule.format_regex, "i").test(text);

  if (!passed && deferredToPackRegex.test(text)) {
    return [false, deferredNote("MRP declaration")];
  }

  return [passed, null];
}

function checkForbiddenWords(value, rule) {
  if (value === null || value === undefined) {
    return [true, null];
  }

  const lowered = String(value).toLowerCase();
  const found = (rule.forbidden_list || []).filter((word) => lowered.includes(String(word).toLowerCase()));
  return [found.length === 0, found.length ? `Found forbidden term(s): ${found.join(", ")}` : null];
}

function checkUnitConvention(value, rule, data) {
  const quantity = data.net_quantity_value;
  const unit = String(value || "").trim();

  if (quantity === null || quantity === undefined || !unit) {
    return [false, "Cannot validate unit convention because quantity or unit is missing"];
  }

  const numericQuantity = Number(quantity);
  if (Number.isNaN(numericQuantity)) {
    return [false, "Quantity is not numeric"];
  }

  const dimensions = rule.rules_by_dimension || {};
  let expectedUnit;
  let normalizedQuantity;

  if (unit === "g" || unit === "kg") {
    normalizedQuantity = unit === "kg" ? numericQuantity * 1000 : numericQuantity;
    const dimension = dimensions.weight;
    expectedUnit = normalizedQuantity < dimension.threshold_value ? dimension.below_threshold : dimension.at_or_above;
  } else if (unit === "ml" || unit === "l") {
    normalizedQuantity = unit === "l" ? numericQuantity * 1000 : numericQuantity;
    const dimension = dimensions.volume;
    expectedUnit = normalizedQuantity < dimension.threshold_value ? dimension.below_threshold : dimension.at_or_above;
  } else if (unit === "cm" || unit === "m") {
    normalizedQuantity = unit === "m" ? numericQuantity * 100 : numericQuantity;
    const dimension = dimensions.length;
    expectedUnit = normalizedQuantity < dimension.threshold_value ? dimension.below_threshold : dimension.at_or_above;
  } else if (unit === "mm" || unit === "N" || unit === "U") {
    return [true, "Unit not in weight, volume, or length category"];
  } else {
    return [false, `Unrecognized unit '${value}'`];
  }

  return [unit === expectedUnit, unit === expectedUnit ? null : `Expected unit '${expectedUnit}', found '${unit}'`];
}

function checkDateFormat(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [false, "Manufacturing month/year missing"];
  }

  const text = String(value).trim();
  if (deferredToPackRegex.test(text)) {
    return [false, deferredNote("manufacturing date")];
  }

  const patterns = [/^\d{1,2}[/-]\d{4}$/, /^[A-Za-z]{3,9}\s?\d{4}$/];
  const passed = patterns.some((pattern) => pattern.test(text));
  return [passed, passed ? null : "Date not in a recognizable MM/YYYY or Month YYYY format"];
}

function checkEnumMatch(value, rule, data) {
  const soldBy = String(data.sold_by || "").toLowerCase();
  if (rule.applies_when_sold_by && soldBy !== String(rule.applies_when_sold_by).toLowerCase()) {
    return [true, null];
  }

  const passed = (rule.allowed_values || []).includes(value);
  return [passed, passed ? null : `Expected one of ${(rule.allowed_values || []).join(", ")}, found '${value}'`];
}

function checkConfidenceThreshold(value, rule) {
  const confidence = Number(value);
  if (Number.isNaN(confidence)) {
    return [false, "No OCR confidence score available"];
  }

  return [confidence >= rule.min_confidence, confidence >= rule.min_confidence ? null : `OCR confidence ${confidence.toFixed(2)} below threshold ${rule.min_confidence}`];
}

function checkLanguageCheck() {
  return [true, "Language check requires manual review"];
}

const checks = {
  presence: checkPresence,
  presence_with_pincode: checkPresenceWithPincode,
  format_regex: checkFormatRegex,
  forbidden_words: checkForbiddenWords,
  unit_convention: checkUnitConvention,
  date_format: checkDateFormat,
  enum_match: checkEnumMatch,
  confidence_threshold: checkConfidenceThreshold,
  language_check: checkLanguageCheck
};

export function runRuleEngine(extractedData) {
  let errors = 0;
  let warnings = 0;

  const results = ruleset.rules.map((rule) => {
    const check = checks[rule.check_type];
    if (!check) {
      return {
        rule_id: rule.rule_id,
        source: rule.source,
        field: rule.field,
        passed: null,
        note: `Unknown check type '${rule.check_type}'`
      };
    }

    const value = extractedData[rule.field];
    const [passed, rawNote] = check(value, rule, extractedData);
    const note = passed ? rawNote : rawNote || null;
    const severity = rule.severity || "error";

    if (!passed) {
      if (severity === "warning") {
        warnings += 1;
      } else {
        errors += 1;
      }
    }

    return {
      rule_id: rule.rule_id,
      source: rule.source,
      field: rule.field,
      value_found: value,
      passed,
      severity,
      message: passed ? null : rule.error_message,
      note,
      manual_review: Boolean(rule.manual_review)
    };
  });

  return {
    ruleset: ruleset.ruleset_name,
    overall_status: errors === 0 ? "COMPLIANT" : "NON_COMPLIANT",
    error_count: errors,
    warning_count: warnings,
    results
  };
}
