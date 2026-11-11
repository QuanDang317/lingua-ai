"use client";

import React from "react";
import { SkillRadarMetric } from "@/types";

interface SkillRadarChartProps {
  metrics: SkillRadarMetric[];
}

export function SkillRadarChart({ metrics }: SkillRadarChartProps) {
  const size = 280;
  const center = size / 2;
  const radius = 90;
  const levels = [25, 50, 75, 100];

  const items =
    metrics.length === 6
      ? metrics
      : [
          { skill: "Listening", label_vi: "Nghe", score: 72, full_mark: 100 },
          { skill: "Speaking", label_vi: "Nói", score: 66, full_mark: 100 },
          { skill: "Reading", label_vi: "Đọc", score: 78, full_mark: 100 },
          { skill: "Writing", label_vi: "Viết", score: 64, full_mark: 100 },
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
        {/* Concentric hexagons (Dark grid lines) */}
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
              stroke="#1e293b"
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
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Active Skill Polygon */}
        <polygon
          points={dataPolygonPoints}
          fill="rgba(15, 118, 110, 0.2)"
          stroke="#0F766E"
          strokeWidth="2"
        />

        {/* Data vertices and labels */}
        {items.map((m, idx) => {
          const pt = getCoordinates(idx, m.score);
          const labelPt = getCoordinates(idx, 122);
          return (
            <g key={m.skill}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#0F766E"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 4}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-slate-300 text-[11px] font-semibold"
              >
                {m.label_vi}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 10}
                textAnchor="middle"
                className="fill-[#0F766E] dark:fill-teal-400 text-[11px] font-extrabold"
              >
                {Math.round(m.score)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
