import { extractFieldsWithGemini } from "@/lib/gemini";
import { runRuleEngine } from "@/lib/rule-engine";

export async function checkLabelCompliance({ imageBytes, mimeType }) {
  const extractedData = await extractFieldsWithGemini({ imageBytes, mimeType });
  const debugInfo = extractedData._debug || {};
  delete extractedData._debug;

  const complianceReport = runRuleEngine(extractedData);

  return {
    extracted_data: extractedData,
    compliance_report: complianceReport,
    ocr_debug: debugInfo
  };
}
