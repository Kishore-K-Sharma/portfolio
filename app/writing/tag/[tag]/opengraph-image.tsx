import { ImageResponse } from "next/og";
import { listTags, notesByTag, tagSlug } from "@/lib/notes";

export const runtime = "nodejs";
export const alt = "Writing tag — Kishore Kumar Sharma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TagOG({ params }: { params: { tag: string } }) {
  const slug = decodeURIComponent(params.tag);
  const match = listTags().find((t) => tagSlug(t.tag) === slug);
  const tag = match?.tag ?? slug;
  const notes = match ? notesByTag(match.tag) : [];
  const recent = notes.slice(0, 3);

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
            /writing/tag · kishore-kumar-sharma.dev
          </span>
          <span>{notes.length} {notes.length === 1 ? "post" : "posts"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div style={{ fontSize: 28, color: "#9B9CA3", marginBottom: 12 }}>Notes tagged</div>
          <div
            style={{
              fontSize: 124,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#C9A8FF",
              fontStyle: "italic",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            #{tag}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#F5F2ED" }}>Kishore Kumar Sharma</div>
            <div style={{ fontSize: 16, color: "#9B9CA3", marginTop: 4 }}>
              Senior Full Stack Engineer
            </div>
          </div>
          {recent.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, maxWidth: 600 }}>
              {recent.map((n) => (
                <div
                  key={n.slug}
                  style={{
                    fontSize: 14,
                    color: "#9B9CA3",
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  · {n.title}
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
