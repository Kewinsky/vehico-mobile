import { readFile } from "node:fs/promises";
import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : numerator / denominator;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateField(field, label) {
  const statuses = new Set(["recognized", "uncertain", "missing", "rejected"]);
  if (!field || !statuses.has(field.status) || !("value" in field)) {
    throw new Error(`Invalid field contract at ${label}`);
  }
  const requiresNull = field.status === "missing" || field.status === "rejected";
  if ((requiresNull && field.value !== null) || (!requiresNull && field.value === null)) {
    throw new Error(`Invalid value presence at ${label}`);
  }
}

function validateDataset(dataset) {
  if (!dataset.version || !Array.isArray(dataset.cases) || !dataset.thresholds) {
    throw new Error("Invalid import evaluation dataset.");
  }
  const ids = new Set();
  const languages = new Set();
  const kinds = new Set();
  for (const testCase of dataset.cases) {
    if (ids.has(testCase.id)) throw new Error(`Duplicate case ID ${testCase.id}`);
    ids.add(testCase.id);
    languages.add(testCase.language);
    kinds.add(testCase.kind);
    for (const [path, field] of Object.entries(testCase.fields ?? {})) {
      validateField(field, `${testCase.id}.${path}`);
    }
  }
  if (!languages.has("pl") || !languages.has("en")) {
    throw new Error("Dataset must contain Polish and English cases.");
  }
  if (!kinds.has("service_invoice") || !kinds.has("fuel_receipt")) {
    throw new Error("Dataset must contain invoices and fuel receipts.");
  }
}

function score(dataset, predictions) {
  const byId = new Map(predictions.cases.map((item) => [item.id, item]));
  let statuses = 0;
  let correctStatuses = 0;
  let values = 0;
  let correctValues = 0;
  let categories = 0;
  let correctCategories = 0;
  let expectedRejections = 0;
  let foundRejections = 0;
  let corrections = 0;

  for (const testCase of dataset.cases) {
    const prediction = byId.get(testCase.id);
    if (!prediction) throw new Error(`Missing prediction for ${testCase.id}`);
    for (const [path, expected] of Object.entries(testCase.fields)) {
      const actual = prediction.fields?.[path];
      statuses += 1;
      if (actual?.status === expected.status) correctStatuses += 1;
      values += 1;
      if (actual && sameValue(actual.value, expected.value)) correctValues += 1;
      if (path.endsWith(".category")) {
        categories += 1;
        if (actual && sameValue(actual.value, expected.value)) {
          correctCategories += 1;
        }
      }
      if (expected.status === "rejected") {
        expectedRejections += 1;
        if (actual?.status === "rejected" && actual.value === null) {
          foundRejections += 1;
        }
      }
      if (
        !actual ||
        actual.status !== expected.status ||
        !sameValue(actual.value, expected.value)
      ) {
        corrections += 1;
      }
    }
  }

  return {
    model: predictions.model,
    datasetVersion: dataset.version,
    fieldStatusAccuracy: ratio(correctStatuses, statuses),
    fieldValueAccuracy: ratio(correctValues, values),
    categoryAccuracy: ratio(correctCategories, categories),
    rejectionRecall: ratio(foundRejections, expectedRejections),
    averageCorrections: ratio(corrections, dataset.cases.length),
  };
}

function passes(metrics, thresholds) {
  return (
    metrics.fieldStatusAccuracy >= thresholds.fieldStatusAccuracy &&
    metrics.fieldValueAccuracy >= thresholds.fieldValueAccuracy &&
    metrics.categoryAccuracy >= thresholds.categoryAccuracy &&
    metrics.rejectionRecall >= thresholds.rejectionRecall &&
    metrics.averageCorrections <= thresholds.maxAverageCorrections
  );
}

const predictionsArgument = argument("--predictions");
if (!predictionsArgument) {
  throw new Error(
    "Pass one or more comma-separated result files with --predictions.",
  );
}

const datasetPath = argument("--dataset") ?? "ai-evals/imports/cases.json";
const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
validateDataset(dataset);
const reports = [];
let failed = false;

for (const path of predictionsArgument.split(",")) {
  const predictions = JSON.parse(await readFile(path, "utf8"));
  const metrics = score(dataset, predictions);
  const passed = passes(metrics, dataset.thresholds);
  reports.push({ ...metrics, passed });
  if (!passed) failed = true;
}

process.stdout.write(`${JSON.stringify({ reports }, null, 2)}\n`);
if (failed) process.exitCode = 1;
