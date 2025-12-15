// frontend/src/components/composition/CropPreview.tsx
import React from "react";
import { CropBox } from "@/stores/useCompositionStore";

type Props = {
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  proposals: CropBox[];
  selected?: CropBox | null;
  onSelect?: (c: CropBox) => void;
};

export default function CropPreview({
  imageUrl,
  imgWidth,
  imgHeight,
  proposals,
  selected,
  onSelect,
}: Props) {
  // compute container aspect ratio, scale etc.
  const aspectRatio = imgHeight / imgWidth;
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingTop: `${aspectRatio * 100}%`,
    backgroundColor: "#111",
  };

  return (
    <div className="w-full">
      <div style={containerStyle} className="rounded overflow-hidden relative">
        <img
          src={imageUrl}
          alt="preview"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {proposals.map((p, idx) => {
          const left = (p.x / imgWidth) * 100;
          const top = (p.y / imgHeight) * 100;
          const w = (p.width / imgWidth) * 100;
          const h = (p.height / imgHeight) * 100;
          const isSel =
            selected &&
            selected.x === p.x &&
            selected.y === p.y &&
            selected.width === p.width;
          return (
            <button
              key={idx}
              onClick={() => onSelect && onSelect(p)}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                width: `${w}%`,
                height: `${h}%`,
                border: isSel
                  ? "3px solid #06b6d4"
                  : "2px dashed rgba(255,255,255,0.9)",
                boxSizing: "border-box",
                background: "transparent",
                cursor: "pointer",
              }}
              aria-label={`proposal-${idx}`}
            />
          );
        })}
        {/* rule of thirds lines */}
        <div
          style={{
            position: "absolute",
            left: "33.333%",
            top: 0,
            bottom: 0,
            width: "0.5px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "66.666%",
            top: 0,
            bottom: 0,
            width: "0.5px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "33.333%",
            left: 0,
            right: 0,
            height: "0.5px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "66.666%",
            left: 0,
            right: 0,
            height: "0.5px",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

