import { normalizeUnit } from "@/lib/unit-normalize";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const responseSchema = {
  type: "OBJECT",
  properties: {
    manufacturer_name: { type: "STRING", nullable: true },
    manufacturer_address: { type: "STRING", nullable: true },
    commodity_name: { type: "STRING", nullable: true },
    net_quantity_value: { type: "NUMBER", nullable: true },
    net_quantity_unit: {
      type: "STRING",
      nullable: true,
      enum: ["g", "kg", "ml", "l", "cm", "m", "mm", "N", "U"]
    },
    mfg_month_year: { type: "STRING", nullable: true },
    mrp: { type: "STRING", nullable: true },
    consumer_care: { type: "STRING", nullable: true },
    sold_by: {
      type: "STRING",
      nullable: true,
      enum: ["weight", "volume", "length", "number"]
    },
    raw_text: { type: "STRING" },
    low_confidence_fields: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["raw_text", "low_confidence_fields"]
};

const prompt = `You are reading a packaged-commodity label for a Legal Metrology (India) compliance check.

Extract these fields from the image exactly as printed:
- manufacturer_name
- manufacturer_address
- commodity_name
- net_quantity_value
- net_quantity_unit
- mfg_month_year
- mrp
- consumer_care
- sold_by
- raw_text
- low_confidence_fields

Rules:
- If the label shows both manufacturer and distributor or marketer details, use only the manufacturer block for manufacturer_name and manufacturer_address.
- For net_quantity_unit, normalize to exactly one of: g, kg, ml, l, cm, m, mm, N, U.
- For sold_by, use exactly one of: weight, volume, length, number.
- For mrp, return the full price line as printed, including tax wording if present.
- If a field is missing, return null instead of guessing.
- Put any uncertain fields into low_confidence_fields.
- raw_text should be your best full transcription of the visible text.`;

function getConfiguredKeys() {
  const explicitList = (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const primary = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY.trim()] : [];
  const uniqueKeys = [...new Set([...primary, ...explicitList])];

  if (uniqueKeys.length === 0) {
    throw new Error("Missing Gemini API key. Set GEMINI_API_KEY in your Vercel environment.");
  }

  return uniqueKeys;
}

async function callGemini({ imageBase64, mimeType, model, apiKey }) {
  const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0
      }
    })
  });

  const rawPayload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      rawPayload?.error?.message ||
      `Gemini request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const candidateText = rawPayload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error("Gemini returned no extractable content.");
  }

  return JSON.parse(candidateText);
}

export async function extractFieldsWithGemini({ imageBytes, mimeType }) {
  const model = DEFAULT_MODEL;
  const keys = getConfiguredKeys();
  const imageBase64 = Buffer.from(imageBytes).toString("base64");
  let lastError = null;

  for (const apiKey of keys) {
    try {
      const parsed = await callGemini({ imageBase64, mimeType, model, apiKey });
      const lowConfidenceFields = Array.isArray(parsed.low_confidence_fields) ? parsed.low_confidence_fields : [];

      return {
        manufacturer_name: parsed.manufacturer_name || null,
        manufacturer_address: parsed.manufacturer_address || null,
        commodity_name: parsed.commodity_name || null,
        net_quantity_value:
          parsed.net_quantity_value === null || parsed.net_quantity_value === undefined
            ? null
            : Number(parsed.net_quantity_value),
        net_quantity_unit: normalizeUnit(parsed.net_quantity_unit),
        mfg_month_year: parsed.mfg_month_year || null,
        mrp: parsed.mrp || null,
        consumer_care: parsed.consumer_care || null,
        sold_by: parsed.sold_by || null,
        ocr_confidence: lowConfidenceFields.length ? 0.6 : 1,
        _debug: {
          ocr_engine_used: "gemini",
          model,
          low_confidence_fields: lowConfidenceFields,
          raw_text: parsed.raw_text || ""
        }
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Gemini extraction failed.");
}
