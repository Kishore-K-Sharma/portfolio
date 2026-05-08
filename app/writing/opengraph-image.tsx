import { ImageResponse } from "next/og";
import { listNotes, listTags } from "@/lib/notes";

export const runtime = "nodejs";
export const alt = "Writing — Kishore Kumar Sharma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function WritingIndexOG() {
  const notes = listNotes();
  const tags = listTags().slice(0, 6);

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
          <span>{notes.length} {notes.length === 1 ? "piece" : "pieces"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div style={{ fontSize: 96, lineHeight: 1.02, letterSpacing: "-0.035em", color: "#F5F2ED" }}>
            Writing on building
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
              color: "#C9A8FF",
              fontStyle: "italic",
              marginTop: 4,
            }}
          >
            things that hold.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#9B9CA3",
              lineHeight: 1.5,
              marginTop: 28,
              maxWidth: 920,
            }}
          >
            Long-form notes on architecture, distributed systems, and the discipline behind production software.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#F5F2ED" }}>Kishore Kumar Sharma</div>
            <div style={{ fontSize: 16, color: "#9B9CA3", marginTop: 4 }}>
              Senior Full Stack Engineer
            </div>
          </div>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              {tags.map(({ tag }) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 14,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #2C2D33",
                    color: "#9B9CA3",
                  }}
                >
                  #{tag}
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
