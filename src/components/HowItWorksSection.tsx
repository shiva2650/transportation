import React, { useState } from 'react';
import {
  TransportState,
  HASH_TABLE_SIZE,
  buildHashTableBuckets,
  hashById,
  hashByName,
  resolveStop,
  findShortestDijkstra,
  findMinStopsBFS,
} from '../utils/transportEngine';

interface HowItWorksSectionProps {
  netState: TransportState;
  sourceId: number;
  destId: number;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  netState,
  sourceId,
  destId,
}) => {
  const [hashSearchInput, setHashSearchInput] = useState<string>('Hospital');
  const [bucketMode, setBucketMode] = useState<'name' | 'id'>('name');
  const [heapStep, setHeapStep] = useState<number>(0);

  const stopMap = new Map<number, string>(
    netState.stops.map((s) => [s.id, s.name])
  );
  const buckets = buildHashTableBuckets(netState.stops, HASH_TABLE_SIZE);

  // Resolve searched stop for interactive Hash Table inspector
  const searchedStop = resolveStop(netState, hashSearchInput);
  const highlightedBucketIdx = searchedStop
    ? bucketMode === 'name'
      ? hashByName(searchedStop.name, HASH_TABLE_SIZE)
      : hashById(searchedStop.id, HASH_TABLE_SIZE)
    : -1;

  // Build interactive Min-Heap snapshots from sourceId across the current network
  const buildHeapSnapshots = () => {
    const snapshots: {
      stepTitle: string;
      extractedStop: string;
      heapNodes: { id: number; name: string; dist: string }[];
    }[] = [];

    const INF = 1e9;
    const dist = new Map<number, number>();
    const unvisited = new Set<number>();

    for (const s of netState.stops) {
      dist.set(s.id, s.id === sourceId ? 0 : INF);
      unvisited.add(s.id);
    }

    const formatHeapState = () =>
      Array.from(unvisited)
        .map((id) => ({
          id,
          name: stopMap.get(id) ?? `Stop ${id}`,
          d: dist.get(id) ?? INF,
        }))
        .sort((a, b) => a.d - b.d)
        .map((item) => ({
          id: item.id,
          name: item.name,
          dist: item.d >= INF ? '∞ km' : `${item.d} km`,
        }));

    snapshots.push({
      stepTitle: `Initial state: Source (${stopMap.get(sourceId) ?? 'Start'}) starts at 0 km at the top of the Min-Heap`,
      extractedStop: 'None yet',
      heapNodes: formatHeapState(),
    });

    while (unvisited.size > 0) {
      let bestId = -1;
      let bestDist = INF;
      for (const id of unvisited) {
        const d = dist.get(id) ?? INF;
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }
      if (bestId === -1 || bestDist >= INF) break;

      unvisited.delete(bestId);
      const uStop = netState.stops.find((s) => s.id === bestId);
      if (uStop) {
        for (const edge of uStop.neighbors) {
          if (unvisited.has(edge.destId)) {
            const alt = bestDist + edge.distance;
            if (alt < (dist.get(edge.destId) ?? INF)) {
              dist.set(edge.destId, alt);
            }
          }
        }
      }

      snapshots.push({
        stepTitle: `Extract minimum stop "${stopMap.get(bestId)}" (${bestDist} km) and update neighbor distances`,
        extractedStop: `${stopMap.get(bestId)} (${bestDist} km)`,
        heapNodes: formatHeapState(),
      });
    }

    return snapshots;
  };

  const heapSnapshots = buildHeapSnapshots();
  const safeHeapStep = Math.min(heapStep, Math.max(0, heapSnapshots.length - 1));
  const currentHeapSnap = heapSnapshots[safeHeapStep];

  const bfsDemo = findMinStopsBFS(netState, sourceId, destId);
  const activeBuckets =
    bucketMode === 'name' ? buckets.nameBuckets : buckets.idBuckets;

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-8"
    >
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          How it works
        </h2>
        <p className="mt-1.5 text-base text-slate-600 dark:text-slate-400">
          Under the hood, four core data structures work together to store the bus network, look up stops instantaneously, and compute the best route.
        </p>
      </div>

      {/* 4 Data Structure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Graph (Adjacency List) */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                1. Graph (Adjacency List)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used to store all stops and direct road connections
              </p>
            </div>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
              Space: O(V + E)
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Each bus stop stores a linked list of only the stops it directly connects to, along with the distance in kilometers. This avoids wasting memory on stops that have no direct road between them.
          </p>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2 max-h-[230px] overflow-y-auto">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Live neighbor lists ({netState.stops.length} stops):
            </div>
            {netState.stops.map((s) => (
              <div
                key={s.id}
                className="text-xs font-mono flex flex-wrap items-center gap-1.5 text-slate-800 dark:text-slate-200"
              >
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {s.name} (#{s.id})
                </span>
                <span className="text-slate-400">→</span>
                {s.neighbors.length === 0 ? (
                  <span className="text-slate-400">No connections</span>
                ) : (
                  s.neighbors.map((n, idx) => (
                    <span key={n.destId}>
                      {stopMap.get(n.destId)} ({n.distance} km)
                      {idx < s.neighbors.length - 1 ? ' → ' : ''}
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        </article>

        {/* 2. Binary Min-Heap (Interactive) */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                2. Binary Min-Heap (Priority Queue)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used in Dijkstra’s algorithm to find the shortest-distance route
              </p>
            </div>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
              Time: O((V + E) log V)
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            The Min-Heap always keeps the unvisited stop with the smallest tentative distance at the very top. Instead of scanning every stop one by one, Dijkstra grabs the closest stop in logarithmic time.
          </p>

          {/* Interactive Heap Step Explorer */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Interactive Min-Heap Step {safeHeapStep + 1} of {heapSnapshots.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHeapStep((s) => Math.max(0, s - 1))}
                  disabled={safeHeapStep === 0}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeapStep((s) => Math.min(heapSnapshots.length - 1, s + 1))
                  }
                  disabled={safeHeapStep >= heapSnapshots.length - 1}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Next step
                </button>
              </div>
            </div>

            {currentHeapSnap && (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {currentHeapSnap.stepTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentHeapSnap.heapNodes.length === 0 ? (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      Heap empty — all reachable stops settled!
                    </span>
                  ) : (
                    currentHeapSnap.heapNodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                          idx === 0
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {idx === 0 ? 'Root (Min): ' : `[${idx}]: `}
                        {node.name} ({node.dist})
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </article>

        {/* 3. Queue (FIFO) */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                3. Queue (First-In, First-Out)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used in Breadth-First Search (BFS) to find the route with fewest stops
              </p>
            </div>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
              Time: O(V + E)
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A FIFO queue explores the network in rings—checking all 1-stop neighbors before any 2-stop neighbors. The first time the destination stop leaves the queue, we are guaranteed the fewest stops.
          </p>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              BFS Queue traversal order for current selection:
            </div>
            {bfsDemo.found ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Front (Dequeue) →</span>
                {bfsDemo.stopNames.map((name, i) => (
                  <React.Fragment key={`${name}-${i}`}>
                    <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      Hop {i}: {name}
                    </span>
                    {i < bfsDemo.stopNames.length - 1 && (
                      <span className="text-slate-400">→</span>
                    )}
                  </React.Fragment>
                ))}
                <span className="text-slate-500">← Rear (Enqueue)</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No reachable path.</p>
            )}
          </div>
        </article>

        {/* 4. Hash Table (Separate Chaining - Interactive) */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                4. Hash Table (Separate Chaining)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used to find any bus stop by name or ID without scanning the list
              </p>
            </div>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
              Lookup: O(1) avg
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A hash function converts a stop’s name or ID into a bucket number (0 to 30). If two stops land in the same bucket, they form a short linked-list chain.
          </p>

          {/* Interactive Hash Table Bucket & Chain Explorer */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="hash-test-input" className="sr-only">
                Test Hash Lookup by Stop Name or ID
              </label>
              <input
                id="hash-test-input"
                type="text"
                value={hashSearchInput}
                onChange={(e) => setHashSearchInput(e.target.value)}
                placeholder="Type stop name or ID (e.g. Hospital or 4)"
                className="flex-1 min-w-[160px] px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setBucketMode('name')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    bucketMode === 'name'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Name buckets
                </button>
                <button
                  type="button"
                  onClick={() => setBucketMode('id')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    bucketMode === 'id'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ID buckets
                </button>
              </div>
            </div>

            {searchedStop ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Found <strong>{searchedStop.name}</strong> (ID #{searchedStop.id}) in{' '}
                <strong>Bucket [{highlightedBucketIdx}]</strong> of {HASH_TABLE_SIZE}
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No stop matches &ldquo;{hashSearchInput}&rdquo;. Try typing an existing stop name.
              </p>
            )}

            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
              {activeBuckets.map((chain, bIdx) => {
                if (chain.length === 0) return null;
                const isMatch = bIdx === highlightedBucketIdx;
                return (
                  <div
                    key={bIdx}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex flex-wrap items-center gap-1.5 ${
                      isMatch
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-semibold">Bucket[{bIdx}]:</span>
                    {chain.map((entry, idx) => (
                      <React.Fragment key={entry.stopId}>
                        <span>
                          #{entry.stopId} {entry.stopName}
                        </span>
                        <span className="text-slate-400">
                          {idx < chain.length - 1 ? '→' : '→ NULL'}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </div>

      {/* Summary Complexity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Operation Time & Space Complexity Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                <th className="py-2.5 pr-4 font-medium">Operation</th>
                <th className="py-2.5 px-4 font-medium">Data Structure</th>
                <th className="py-2.5 px-4 font-mono font-medium">Time Complexity</th>
                <th className="py-2.5 pl-4 font-mono font-medium">Space Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 pr-4 font-medium">Search stop by ID or name</td>
                <td className="py-2.5 px-4">Hash Table (Separate Chaining)</td>
                <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">O(1) avg</td>
                <td className="py-2.5 pl-4 font-mono">O(V)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">Find shortest-distance route</td>
                <td className="py-2.5 px-4">Dijkstra + Binary Min-Heap</td>
                <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">O((V + E) log V)</td>
                <td className="py-2.5 pl-4 font-mono">O(V)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">Find fewest-stops route</td>
                <td className="py-2.5 px-4">BFS + FIFO Queue</td>
                <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">O(V + E)</td>
                <td className="py-2.5 pl-4 font-mono">O(V)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">Store stops & connections</td>
                <td className="py-2.5 px-4">Graph Adjacency List</td>
                <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">O(1) per stop</td>
                <td className="py-2.5 pl-4 font-mono">O(V + E)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
