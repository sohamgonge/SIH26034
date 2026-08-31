import { checkLabelCompliance } from "@/lib/compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || typeof image.arrayBuffer !== "function") {
      return Response.json({ message: "Please upload a label image." }, { status: 400 });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    const mimeType = image.type || "image/jpeg";

    const result = await checkLabelCompliance({ imageBytes: bytes, mimeType });
    return Response.json(result);
  } catch (error) {
    const status = error.status && Number.isInteger(error.status) ? error.status : 500;
    return Response.json(
      {
        message: error.message || "Compliance check failed."
      },
      { status }
    );
  }
}
