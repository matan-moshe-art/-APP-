import { NextResponse } from "next/server";

const MAX_PDF_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "לא נבחר קובץ PDF." },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "not_pdf", message: "יש להעלות קובץ PDF בלבד." },
      { status: 400 },
    );
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "קובץ ה-PDF גדול מדי." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = String(parsed.text ?? "").trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "empty_pdf",
          message: "לא נמצא טקסט בקובץ. נסו קובץ אחר או הדביקו את הטקסט ידנית.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      {
        error: "parse_failed",
        message: "לא הצלחנו לקרוא את ה-PDF. נסו קובץ אחר.",
      },
      { status: 502 },
    );
  }
}
