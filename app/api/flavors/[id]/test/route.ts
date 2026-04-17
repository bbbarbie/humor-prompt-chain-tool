import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";
import { buildPromptChain, normalizeCaptions } from "@/lib/flavor-helpers";
import type { HumorFlavorStep } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function flattenPromptChain(promptChain: unknown): string {
  if (!promptChain) return "";
  if (typeof promptChain === "string") return promptChain;

  if (Array.isArray(promptChain)) {
    return promptChain
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return Object.entries(item as Record<string, unknown>)
            .map(([key, value]) => `${key}: ${String(value ?? "")}`)
            .join("\n");
        }
        return String(item);
      })
      .join("\n\n");
  }

  if (typeof promptChain === "object") {
    return Object.entries(promptChain as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${String(value ?? "")}`)
      .join("\n");
  }

  return String(promptChain);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    imageId?: unknown;
  } | null;

  const imageId = typeof body?.imageId === "string" || typeof body?.imageId === "number" ? String(body.imageId) : "";
  if (!imageId) {
    return NextResponse.json({ error: "An image is required." }, { status: 400 });
  }

  const { data: sessionData } = await auth.supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return NextResponse.json({ error: "Missing session token." }, { status: 401 });
  }

  const downstreamUrl = "https://api.almostcrackd.ai/pipeline/generate-captions";

  console.info("[flavor-test] starting downstream request", {
    flavorId: id,
    imageId,
    downstreamUrl,
  });

  const { error: flavorError } = await auth.supabase
    .from("humor_flavors")
    .select("id")
    .eq("id", id)
    .single();

  if (flavorError) {
    return NextResponse.json({ error: flavorError.message }, { status: 404 });
  }

  const { data: stepsData, error: stepsError } = await auth.supabase
    .from("humor_flavor_steps")
    .select(
      "id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt",
    )
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: true });

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  const steps = (stepsData ?? []) as HumorFlavorStep[];
  if (steps.length === 0) {
    return NextResponse.json({ error: "Add at least one step before testing." }, { status: 400 });
  }

  const { data: imageRecord, error: imageError } = await auth.supabase
    .from("images")
    .select("id, url")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) {
    console.error("[flavor-test] image lookup failed", {
      imageId,
      error: imageError.message,
    });
    return NextResponse.json({ error: "Unable to validate the selected image." }, { status: 500 });
  }

  if (!imageRecord) {
    console.error("[flavor-test] selected image was not found", { imageId });
    return NextResponse.json({ error: "Selected image was not found." }, { status: 404 });
  }

  const promptChain = buildPromptChain(steps);
  const flavorPrompt = flattenPromptChain(promptChain);
  const downstreamPayload = {
    imageId,
    promptChain,
    flavorPrompt,
  };

  console.info("[flavor-test] downstream payload", {
    flavorId: id,
    imageId,
    hasPromptChain: promptChain.length > 0,
    flavorPromptPreview: flavorPrompt.slice(0, 300),
  });

  const response = await fetch(downstreamUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(downstreamPayload),
  });

  console.info("[flavor-test] downstream response received", {
    imageId,
    downstreamUrl,
    status: response.status,
  });

  const rawBody = await response.text().catch(() => "");
  const json = (rawBody
    ? ((() => {
        try {
          return JSON.parse(rawBody);
        } catch {
          return null;
        }
      })() as unknown)
    : null) as
    | {
        error?: string;
        message?: string;
      }
    | null;

  if (!response.ok) {
    console.error("[flavor-test] downstream request failed", {
      imageId,
      downstreamUrl,
      status: response.status,
      body: rawBody,
    });

    return NextResponse.json(
      { error: json?.error || json?.message || "Caption generation failed." },
      { status: response.status },
    );
  }

  return NextResponse.json({
    captions: normalizeCaptions(json as never),
    promptChain,
  });
}
