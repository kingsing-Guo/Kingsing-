import React, { useMemo, useRef, useState } from 'react';
import type { IndicatorNode } from '../../types/model';
import { X } from 'lucide-react';

interface DraggableWeightBarProps {
  node: IndicatorNode;
  onCancel: () => void;
  onSave: (weights: { id: string; weight: number }[]) => void;
}

const WEIGHT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-rose-500',
];

const MIN_WEIGHT = 1;
const TARGET_TOTAL_WEIGHT = 100;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const areWeightsSame = (a: { id: string; weight: number }[], b: { id: string; weight: number }[]) =>
  a.length === b.length && a.every((item, idx) => item.id === b[idx].id && item.weight === b[idx].weight);

const normalizeWeightsTo100 = (weights: { id: string; weight: number }[]) => {
  if (weights.length === 0) {
    return weights;
  }
  if (weights.length === 1) {
    return [{ ...weights[0], weight: TARGET_TOTAL_WEIGHT }];
  }
  if (weights.length * MIN_WEIGHT > TARGET_TOTAL_WEIGHT) {
    const base = Math.floor(TARGET_TOTAL_WEIGHT / weights.length);
    let left = TARGET_TOTAL_WEIGHT - base * weights.length;
    return weights.map((item) => {
      const extra = left > 0 ? 1 : 0;
      if (left > 0) {
        left -= 1;
      }
      return { ...item, weight: base + extra };
    });
  }

  const safeWeights = weights.map((item) => Math.max(0, item.weight || 0));
  const rawTotal = safeWeights.reduce((sum, value) => sum + value, 0);
  if (rawTotal <= 0) {
    const base = Math.floor(TARGET_TOTAL_WEIGHT / weights.length);
    let left = TARGET_TOTAL_WEIGHT - base * weights.length;
    return weights.map((item) => {
      const extra = left > 0 ? 1 : 0;
      if (left > 0) {
        left -= 1;
      }
      return { ...item, weight: base + extra };
    });
  }

  const scalableTotal = TARGET_TOTAL_WEIGHT - weights.length * MIN_WEIGHT;
  const raw = weights.map((item, index) => {
    const scaled = (safeWeights[index] / rawTotal) * scalableTotal;
    const base = Math.floor(scaled) + MIN_WEIGHT;
    return {
      id: item.id,
      base,
      fraction: scaled - Math.floor(scaled),
    };
  });

  let left = TARGET_TOTAL_WEIGHT - raw.reduce((sum, item) => sum + item.base, 0);
  const mapped = raw
    .slice()
    .sort((a, b) => b.fraction - a.fraction)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.base;
      return acc;
    }, {});

  let index = 0;
  const sortedIds = raw.slice().sort((a, b) => b.fraction - a.fraction).map((item) => item.id);
  while (left > 0 && sortedIds.length > 0) {
    const id = sortedIds[index % sortedIds.length];
    mapped[id] += 1;
    left -= 1;
    index += 1;
  }

  return weights.map((item) => ({
    ...item,
    weight: mapped[item.id] ?? MIN_WEIGHT,
  }));
};

export const DraggableWeightBar: React.FC<DraggableWeightBarProps> = ({ node, onCancel, onSave }) => {
  const seedWeights = useMemo(
    () => (node.children || []).map((child) => ({ id: child.id, weight: child.weight || 0 })),
    [node.children],
  );
  const normalizedSeedWeights = useMemo(() => normalizeWeightsTo100(seedWeights), [seedWeights]);
  const hasNormalizationDiff = useMemo(() => !areWeightsSame(seedWeights, normalizedSeedWeights), [seedWeights, normalizedSeedWeights]);

  const [localWeights, setLocalWeights] = useState<{ id: string; weight: number }[]>(normalizedSeedWeights);
  const [initialWeights, setInitialWeights] = useState<{ id: string; weight: number }[]>(normalizedSeedWeights);
  const [hasChanges, setHasChanges] = useState(hasNormalizationDiff);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const barRef = useRef<HTMLDivElement>(null);
  const draggingIndexRef = useRef<number | null>(null);

  const totalWeight = useMemo(
    () => localWeights.reduce((sum, item) => sum + item.weight, 0) || TARGET_TOTAL_WEIGHT,
    [localWeights],
  );
  const boundaryPercents = useMemo(
    () =>
      localWeights.slice(0, -1).reduce<number[]>((acc, item) => {
        const segmentPercent = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;
        const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
        return [...acc, prev + segmentPercent];
      }, []),
    [localWeights, totalWeight],
  );

  const applyBoundaryDrag = (relativeX: number, index: number) => {
    setLocalWeights((prev) => {
      if (index < 0 || index >= prev.length - 1) {
        return prev;
      }

      const currentTotal = prev.reduce((sum, item) => sum + item.weight, 0) || TARGET_TOTAL_WEIGHT;
      const currentWeight = prev[index].weight;
      const nextWeight = prev[index + 1].weight;
      const pairTotal = currentWeight + nextWeight;

      let before = 0;
      for (let i = 0; i < index; i += 1) {
        before += prev[i].weight;
      }

      const targetBoundaryWeight = (relativeX / 100) * currentTotal;
      const nextCurrentWeight = Math.round(
        clamp(targetBoundaryWeight - before, MIN_WEIGHT, Math.max(MIN_WEIGHT, pairTotal - MIN_WEIGHT)),
      );
      const nextNextWeight = pairTotal - nextCurrentWeight;

      const next = [...prev];
      next[index] = { ...next[index], weight: nextCurrentWeight };
      next[index + 1] = { ...next[index + 1], weight: Math.max(MIN_WEIGHT, nextNextWeight) };
      return next;
    });
    setHasChanges(true);
  };

  const handlePointerDown = (index: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!barRef.current) {
      return;
    }

    draggingIndexRef.current = index;
    setDraggingIndex(index);

    barRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const index = draggingIndexRef.current;
    if (index === null || !barRef.current) {
      return;
    }

    const rect = barRef.current.getBoundingClientRect();
    const px = clamp(event.clientX - rect.left, 0, rect.width);
    const ratio = rect.width > 0 ? px / rect.width : 0;
    applyBoundaryDrag(ratio * 100, index);
  };

  const stopDragging = () => {
    draggingIndexRef.current = null;
    setDraggingIndex(null);
  };

  const handleReset = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!hasChanges) {
      return;
    }
    setLocalWeights(initialWeights);
    setHasChanges(false);
  };

  const handleSave = (event: React.MouseEvent) => {
    event.stopPropagation();
    const normalized = normalizeWeightsTo100(localWeights);
    onSave(normalized);
    setInitialWeights(normalized);
    setLocalWeights(normalized);
    setHasChanges(false);
  };

  if (!node.children || node.children.length <= 1) {
    return null;
  }

  return (
    <div className="mx-4 my-3 rounded-2xl border border-[#d9def7] bg-[#f5f6ff] p-4 shadow-sm">
      <div
        ref={barRef}
        className="relative h-11 overflow-hidden rounded-xl border border-[#bcd0ff] bg-white"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onLostPointerCapture={stopDragging}
      >
        <div className="flex h-full w-full">
          {localWeights.map((item, index) => {
            const segmentPercent = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;
            const child = node.children?.find((entry) => entry.id === item.id);
            const colorClass = WEIGHT_COLORS[index % WEIGHT_COLORS.length];

            return (
              <div
                key={item.id}
                className={`${colorClass} relative flex h-full items-center justify-center text-white`}
                style={{ width: `${segmentPercent}%` }}
                title={`${child?.name || ''}: ${item.weight}%`}
              >
                <span className="truncate px-2 text-[13px] font-semibold tracking-[0.2px]">
                  {segmentPercent > 16 ? `${child?.name || ''} (${item.weight}%)` : `${item.weight}%`}
                </span>
              </div>
            );
          })}
        </div>

        {boundaryPercents.map((percent, index) => {
          const item = localWeights[index];
          return (
            <button
              key={`handler-${item.id}`}
              type="button"
              className="absolute top-0 z-20 h-full w-4 -translate-x-1/2 cursor-col-resize"
              style={{ left: `${percent}%` }}
              onPointerDown={handlePointerDown(index)}
              title="拖拽调整相邻指标权重"
            >
              <span
                className={`pointer-events-none absolute left-1/2 top-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow ${
                  draggingIndex === index ? 'ring-2 ring-blue-300' : ''
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-gray-600">
          {localWeights.map((item, index) => {
            const child = node.children?.find((entry) => entry.id === item.id);
            const dotColor = WEIGHT_COLORS[index % WEIGHT_COLORS.length].replace('bg-', 'text-');

            return (
              <div key={`legend-${item.id}`} className="flex items-center gap-2">
                <span className={`${dotColor} text-[20px] leading-none`}>•</span>
                <span className="max-w-[220px] truncate text-[12px] text-gray-700">
                  {child?.name}: {item.weight}%
                </span>
              </div>
            );
          })}
          <div className={`text-xs font-medium ${totalWeight === TARGET_TOTAL_WEIGHT ? 'text-gray-500' : 'text-red-500'}`}>
            当前总分: {totalWeight}%
          </div>
          {hasNormalizationDiff && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              已按100%基准归一化，点击保存后生效
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            className={`text-xs font-medium transition-colors ${
              hasChanges ? 'text-gray-500 hover:text-gray-700' : 'cursor-not-allowed text-gray-300'
            }`}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            重置
          </button>

          <button
            className={`rounded-xl px-5 py-2 text-xs font-medium transition-colors ${
              hasChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存
          </button>

          <button
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
