import { ImageResponse } from "next/og";

export const alt = "Denalix Tech — AI automation and custom software consulting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social preview image, generated at build time.
 *
 * Uses only system fonts and inline styles so it needs no network access
 * during the build and adds no client-side dependency.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "72px",
          position: "relative",
        }}
      >
        {/* Warm brand glow, matching the noir/gold system */}
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(242,184,75,0.22), rgba(0,0,0,0) 70%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#f2b84b",
              display: "flex",
            }}
          />
          <div style={{ color: "#ffffff", fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            Denalix Tech
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 940,
              display: "flex",
            }}
          >
            AI automation and custom software that help businesses scale
          </div>
          <div
            style={{
              marginTop: 28,
              color: "#9a9a9a",
              fontSize: 28,
              lineHeight: 1.4,
              maxWidth: 880,
              display: "flex",
            }}
          >
            Workflow automation, dashboards, custom software, and GIS for growing teams.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "#f2b84b", fontSize: 24, fontWeight: 600, display: "flex" }}>
            denalixtech.com
          </div>
          <div style={{ color: "#636363", fontSize: 22, display: "flex" }}>
            Modernize. Automate. Scale with confidence.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
