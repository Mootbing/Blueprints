import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ComponentSchema } from "./schema.ts";

export function extractJson(text: string): string | null {
  const tagMatch = text.match(/<json>([\s\S]*?)<\/json>/);
  if (tagMatch) return tagMatch[1].trim();

  const arrayStart = text.indexOf("[");
  const objectStart = text.indexOf("{");

  if (arrayStart === -1 && objectStart === -1) return null;

  const start =
    arrayStart === -1
      ? objectStart
      : objectStart === -1
        ? arrayStart
        : Math.min(arrayStart, objectStart);

  const isArray = text[start] === "[";
  const closing = isArray ? "]" : "}";

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === (isArray ? "[" : "{")) depth++;
    else if (text[i] === closing) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

const ComponentArraySchema = z.array(ComponentSchema);

export function parseComponentArray(text: string): z.infer<typeof ComponentArraySchema> {
  const json = extractJson(text);
  if (!json) throw new Error("No JSON found in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON in response");
  }

  if (Array.isArray(parsed)) {
    return ComponentArraySchema.parse(parsed);
  }
  return [ComponentSchema.parse(parsed)];
}

export function parseSingleComponent(text: string): z.infer<typeof ComponentSchema> {
  const json = extractJson(text);
  if (!json) throw new Error("No JSON found in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON in response");
  }

  return ComponentSchema.parse(parsed);
}

export function containsComponentJson(text: string): boolean {
  try {
    const json = extractJson(text);
    if (!json) return false;
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      ComponentArraySchema.parse(parsed);
    } else {
      ComponentSchema.parse(parsed);
    }
    return true;
  } catch {
    return false;
  }
}
