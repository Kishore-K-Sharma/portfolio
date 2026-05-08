import { ImageResponse } from "next/og";
import { loadNote } from "@/lib/notes";

export const runtime = "nodejs";
export const alt = "Note by Kishore Kumar Sharma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function NoteOG({ params }: { params: { slug: string } }) {
  const note = loadNote(params.slug);
  if (!note) {
    // Fallback OG for unknown slugs
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
          /writing
        </div>
      ),
      { ...size }
    );
  }

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
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#C9A8FF" }} />
            /writing · kishore-kumar-sharma.dev
          </span>
          <span>{note.readMin} min read</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div
            style={{
              fontSize: clampFont(note.title, 64, 92),
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "#F5F2ED",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {note.title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#9B9CA3",
              lineHeight: 1.5,
              marginTop: 28,
              maxWidth: 920,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {note.description}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#F5F2ED" }}>Kishore Kumar Sharma</div>
            <div style={{ fontSize: 16, color: "#9B9CA3", marginTop: 4 }}>
              Senior Full Stack Engineer
            </div>
          </div>
          {note.tags && note.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              {note.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 14,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #2C2D33",
                    color: "#9B9CA3",
                  }}
                >
                  #{t}
                </span>
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
  // Rough heuristic: scale font down with title length
  if (text.length <= 36) return max;
  if (text.length <= 56) return Math.round((min + max) / 2);
  return min;
}
