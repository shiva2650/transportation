import React, { useState } from 'react';
import { BusStop, RouteResult } from '../utils/transportEngine';

interface NetworkGraphCanvasProps {
  stops: BusStop[];
  activeRoute: RouteResult | null;
  selectedSourceId: number | null;
  selectedDestId: number | null;
  onSelectStop: (stopId: number) => void;
}

export const NetworkGraphCanvas: React.FC<NetworkGraphCanvasProps> = ({
  stops,
  activeRoute,
  selectedSourceId,
  selectedDestId,
  onSelectStop,
}) => {
  const [inspectedStopId, setInspectedStopId] = useState<number | null>(null);

  const stopMap = new Map<number, BusStop>(stops.map((s) => [s.id, s]));

  // Build unique undirected edges
  const edges: { u: BusStop; v: BusStop; distance: number; isHighlighted: boolean }[] = [];
  const activePairs = new Set<string>();
  const hasActiveRoute = Boolean(
    activeRoute && activeRoute.found && activeRoute.stopIds.length > 1
  );

  if (hasActiveRoute && activeRoute) {
    for (let i = 0; i < activeRoute.stopIds.length - 1; i++) {
      const a = activeRoute.stopIds[i];
      const b = activeRoute.stopIds[i + 1];
      activePairs.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
  }

  for (const s of stops) {
    for (const n of s.neighbors) {
      if (s.id < n.destId) {
        const dest = stopMap.get(n.destId);
        if (dest) {
          const key = `${s.id}-${dest.id}`;
          edges.push({
            u: s,
            v: dest,
            distance: n.distance,
            isHighlighted: activePairs.has(key),
          });
        }
      }
    }
  }

  const activeStopSet = new Set<number>(activeRoute?.found ? activeRoute.stopIds : []);
  const inspectedStop =
    (inspectedStopId !== null ? stopMap.get(inspectedStopId) : undefined) ||
    (selectedSourceId !== null ? stopMap.get(selectedSourceId) : undefined) ||
    stops[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Bus Network Map
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hover or click any stop to view its connections
          </p>
        </div>

        {/* Small Legend */}
        <div
          aria-label="Map Legend"
          className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-blue-600 dark:bg-blue-400 inline-block" />
            Selected route
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
            From / To stop
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 dark:border-slate-500 inline-block" />
            Bus stop
          </span>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
        <svg
          data-testid="network-graph-svg"
          viewBox="0 0 760 340"
          className="w-full h-auto min-h-[230px] max-h-[340px] select-none block"
          role="img"
          aria-label="Bus Network Map showing stops and distances in kilometers"
        >
          {/* Connections (Edges) */}
          {edges.map((e) => {
            const midX = (e.u.x + e.v.x) / 2;
            const midY = (e.u.y + e.v.y) / 2;
            const faded = hasActiveRoute && !e.isHighlighted;

            return (
              <g
                key={`edge-${e.u.id}-${e.v.id}`}
                className="transition-opacity duration-200"
                style={{ opacity: faded ? 0.25 : 1 }}
              >
                <line
                  x1={e.u.x}
                  y1={e.u.y}
                  x2={e.v.x}
                  y2={e.v.y}
                  className={
                    e.isHighlighted
                      ? 'stroke-blue-600 dark:stroke-blue-400'
                      : 'stroke-slate-300 dark:stroke-slate-700'
                  }
                  strokeWidth={e.isHighlighted ? 5 : 2}
                  strokeLinecap="round"
                />
                <rect
                  x={midX - 24}
                  y={midY - 11}
                  width={48}
                  height={22}
                  rx={6}
                  className={
                    e.isHighlighted
                      ? 'fill-blue-600 dark:fill-blue-500 stroke-blue-700 dark:stroke-blue-300'
                      : 'fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700'
                  }
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${
                    e.isHighlighted
                      ? 'fill-white font-semibold'
                      : 'fill-slate-700 dark:fill-slate-300'
                  }`}
                >
                  {e.distance} km
                </text>
              </g>
            );
          })}

          {/* Stops (Vertices) */}
          {stops.map((stop) => {
            const isEndpoint = stop.id === selectedSourceId || stop.id === selectedDestId;
            const isInRoute = activeStopSet.has(stop.id);
            const routeOrder = activeRoute?.found ? activeRoute.stopIds.indexOf(stop.id) : -1;
            const faded = hasActiveRoute && !isInRoute && !isEndpoint;

            let circleClasses =
              'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600';
            let textClasses = 'fill-slate-800 dark:fill-slate-200';

            if (isInRoute) {
              circleClasses =
                'fill-blue-600 dark:fill-blue-500 stroke-blue-200 dark:stroke-blue-900';
              textClasses = 'fill-white';
            }
            if (isEndpoint) {
              circleClasses =
                'fill-emerald-600 dark:fill-emerald-500 stroke-emerald-200 dark:stroke-emerald-900';
              textClasses = 'fill-white';
            }

            return (
              <g
                key={`stop-${stop.id}`}
                transform={`translate(${stop.x}, ${stop.y})`}
                onClick={() => {
                  setInspectedStopId(stop.id);
                  onSelectStop(stop.id);
                }}
                onMouseEnter={() => setInspectedStopId(stop.id)}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: faded ? 0.45 : 1 }}
                role="button"
                tabIndex={0}
                aria-label={`Stop ${stop.id}: ${stop.name}`}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setInspectedStopId(stop.id);
                    onSelectStop(stop.id);
                  }
                }}
              >
                <circle
                  r={22}
                  className={circleClasses}
                  strokeWidth={isInRoute || isEndpoint ? 3.5 : 2}
                />
                <text
                  y={4}
                  textAnchor="middle"
                  className={`text-xs font-semibold ${textClasses}`}
                >
                  {stop.id}
                </text>
                {routeOrder >= 0 && (
                  <g transform="translate(16, -16)">
                    <circle
                      r={9}
                      className="fill-slate-900 dark:fill-white stroke-white dark:stroke-slate-900"
                      strokeWidth={1.5}
                    />
                    <text
                      y={3.5}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-white dark:fill-slate-900"
                    >
                      {routeOrder + 1}
                    </text>
                  </g>
                )}
                <text
                  y={38}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-slate-800 dark:fill-slate-200"
                >
                  {stop.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover / Click Stop Inspector Bar */}
      {inspectedStop && (
        <div
          data-testid="stop-inspector"
          className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
        >
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {inspectedStop.name}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>Stop ID #{inspectedStop.id}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Direct connections: </span>
            {inspectedStop.neighbors.length === 0 ? (
              <span>None</span>
            ) : (
              inspectedStop.neighbors.map((n, idx) => {
                const target = stopMap.get(n.destId);
                return (
                  <span key={n.destId} className="text-slate-800 dark:text-slate-200 font-medium">
                    {target?.name ?? `Stop ${n.destId}`} ({n.distance} km)
                    {idx < inspectedStop.neighbors.length - 1 ? ', ' : ''}
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
