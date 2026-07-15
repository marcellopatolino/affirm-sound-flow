import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(1200),
  lang: z.enum(["pt", "es", "en"]).default("pt"),
});

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const instructions =
      data.lang === "pt"
        ? "Fale em português do Brasil, com voz feminina calma, natural e reconfortante. Pronuncie com clareza."
        : data.lang === "es"
          ? "Habla en español, con voz femenina calmada, natural y reconfortante. Pronuncia con claridad."
          : "Speak in English, with a calm, natural, reassuring feminine voice. Enunciate clearly.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: "shimmer",
        instructions,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      throw new Error(`TTS failed: ${res.status} ${errText}`);
    }
    const arr = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    const base64 = btoa(bin);
    return { base64, mime: "audio/mpeg" };
  });