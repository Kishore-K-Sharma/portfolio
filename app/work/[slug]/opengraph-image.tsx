import { ImageResponse } from "next/og";
import { loadWorkMeta } from "@/lib/work";

export const runtime = "nodejs";
export const alt = "Case study by Kishore Kumar Sharma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DOMAIN_HEX: Record<string, string> = {
  telecom: "#7DD3FC",
  fintech: "#E0B96A",
  edtech: "#A8C8A1",
  govtech: "#D4756B",
};

export default async function WorkOG({ params }: { params: { slug: string } }) {
  const work = loadWorkMeta(params.slug);
  if (!work) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0A0A0B",
            color: "#F5F2ED",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          /work
        </div>
      ),
      { ...size }
    );
  }

  const accent = DOMAIN_HEX[work.domain] ?? "#C9A8FF";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0B",
          color: "#F5F2ED",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#9B9CA3" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, textTransform: "uppercase", letterSpacing: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: accent }} />
            {work.domain} · case study
          </span>
          <span>kishore-kumar-sharma.dev/work</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div
            style={{
              fontSize: clampFont(work.title, 56, 80),
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#F5F2ED",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {work.title}
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#9B9CA3",
              lineHeight: 1.5,
              marginTop: 24,
              maxWidth: 900,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {work.summary}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, color: "#F5F2ED" }}>{work.role}</div>
            <div style={{ fontSize: 16, color: "#9B9CA3", marginTop: 4 }}>{work.company}</div>
          </div>
          {work.outcomes && work.outcomes.length > 0 && (
            <div style={{ display: "flex", gap: 28 }}>
              {work.outcomes.slice(0, 3).map((o) => (
                <div key={o.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: 12, color: "#9B9CA3", textTransform: "uppercase", letterSpacing: 1 }}>
                    {o.label}
                  </div>
                  <div style={{ fontSize: 32, color: accent, marginTop: 4, letterSpacing: "-0.02em" }}>
                    {o.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}

function clampFont(text: string, min: number, max: number): number {
  if (text.length <= 32) return max;
  if (text.length <= 52) return Math.round((min + max) / 2);
  return min;
}
