"use client";

import React from "react";
import { SkillRadarMetric } from "@/types";

interface SkillRadarChartProps {
  metrics: SkillRadarMetric[];
}

export function SkillRadarChart({ metrics }: SkillRadarChartProps) {
  const size = 290;
  const center = size / 2;
  const radius = 96;
  const levels = [25, 50, 75, 100];

  const items =
    metrics.length === 6
      ? metrics
      : [
          { skill: "Listening", label_vi: "Nghe hiểu", score: 72, full_mark: 100 },
          { skill: "Speaking", label_vi: "Nói & Phát âm", score: 66, full_mark: 100 },
          { skill: "Reading", label_vi: "Đọc hiểu", score: 78, full_mark: 100 },
          { skill: "Writing", label_vi: "Viết & Chữ Hán", score: 64, full_mark: 100 },
          { skill: "Vocabulary", label_vi: "Từ vựng", score: 80, full_mark: 100 },
          { skill: "Grammar", label_vi: "Ngữ pháp", score: 70, full_mark: 100 },
        ];

  const getCoordinates = (index: number, valuePercent: number) => {
    const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
    const r = (valuePercent / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const dataPolygonPoints = items
    .map((m, idx) => {
      const pt = getCoordinates(idx, Math.max(10, Math.min(100, m.score)));
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        role="img"
        aria-label="Biểu đồ Radar 6 kỹ năng ngoại ngữ"
      >
        {/* Concentric hexagons */}
        {levels.map((lvl) => {
          const ringPoints = items
            .map((_, idx) => {
              const pt = getCoordinates(idx, lvl);
              return `${pt.x},${pt.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={lvl}
              points={ringPoints}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={lvl === 100 ? "none" : "3 3"}
            />
          );
        })}

        {/* Axis lines */}
        {items.map((_, idx) => {
          const end = getCoordinates(idx, 100);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Active Skill Polygon */}
        <polygon
          points={dataPolygonPoints}
          fill="rgba(79, 70, 229, 0.22)"
          stroke="#4f46e5"
          strokeWidth="2.5"
        />

        {/* Data vertices and labels */}
        {items.map((m, idx) => {
          const pt = getCoordinates(idx, m.score);
          const labelPt = getCoordinates(idx, 126);
          return (
            <g key={m.skill}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 5}
                textAnchor="middle"
                className="fill-slate-700 text-[11px] font-bold"
              >
                {m.label_vi}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 9}
                textAnchor="middle"
                className="fill-indigo-600 text-[11px] font-extrabold"
              >
                {Math.round(m.score)}/100
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
