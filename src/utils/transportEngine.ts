export interface EdgeNode {
  destId: number;
  distance: number;
}

export interface BusStop {
  id: number;
  name: string;
  x: number;
  y: number;
  neighbors: EdgeNode[];
}

export interface RouteResult {
  stopIds: number[];
  stopNames: string[];
  totalStops: number;
  transfers: number;
  totalDistance: number;
  estimatedTimeMinutes: number;
  found: boolean;
  label?: string;
}

export interface HashBucketEntry {
  stopId: number;
  stopName: string;
}

export interface TransportState {
  stops: BusStop[];
  avgSpeedKmph: number;
}

export const HASH_TABLE_SIZE = 31;
export const DEFAULT_BUS_SPEED = 25;

const SAMPLE_COORDS: Record<number, { x: number; y: number }> = {
  1: { x: 110, y: 170 }, // College
  2: { x: 280, y: 85 },  // Library
  3: { x: 280, y: 255 }, // Market
  4: { x: 480, y: 85 },  // Hospital
  5: { x: 480, y: 255 }, // Railway Station
  6: { x: 650, y: 170 }, // City Center
};

export function createSampleTransportState(): TransportState {
  const state: TransportState = {
    stops: [
      { id: 1, name: 'College', x: 110, y: 170, neighbors: [] },
      { id: 2, name: 'Library', x: 280, y: 85, neighbors: [] },
      { id: 3, name: 'Market', x: 280, y: 255, neighbors: [] },
      { id: 4, name: 'Hospital', x: 480, y: 85, neighbors: [] },
      { id: 5, name: 'Railway Station', x: 480, y: 255, neighbors: [] },
      { id: 6, name: 'City Center', x: 650, y: 170, neighbors: [] },
    ],
    avgSpeedKmph: DEFAULT_BUS_SPEED,
  };

  addConnection(state, 1, 2, 3);
  addConnection(state, 1, 3, 5);
  addConnection(state, 2, 4, 4);
  addConnection(state, 3, 5, 2);
  addConnection(state, 4, 6, 6);
  addConnection(state, 5, 6, 3);
  addConnection(state, 4, 5, 5);

  return state;
}

/**
 * Custom hash functions matching hashtable.c
 */
export function hashById(stopId: number, numBuckets = HASH_TABLE_SIZE): number {
  const u = Math.abs(stopId) >>> 0;
  return Number((BigInt(u) * 2654435761n) % BigInt(numBuckets));
}

export function hashByName(name: string, numBuckets = HASH_TABLE_SIZE): number {
  let hashVal = 0;
  const lower = name.trim().toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    hashVal = (hashVal * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return hashVal % numBuckets;
}

export function buildHashTableBuckets(stops: BusStop[], numBuckets = HASH_TABLE_SIZE): {
  idBuckets: HashBucketEntry[][];
  nameBuckets: HashBucketEntry[][];
} {
  const idBuckets: HashBucketEntry[][] = Array.from({ length: numBuckets }, () => []);
  const nameBuckets: HashBucketEntry[][] = Array.from({ length: numBuckets }, () => []);

  for (const s of stops) {
    const idIdx = hashById(s.id, numBuckets);
    const nameIdx = hashByName(s.name, numBuckets);
    idBuckets[idIdx].unshift({ stopId: s.id, stopName: s.name });
    nameBuckets[nameIdx].unshift({ stopId: s.id, stopName: s.name });
  }

  return { idBuckets, nameBuckets };
}

export function resolveStop(state: TransportState, query: string | number): BusStop | undefined {
  if (typeof query === 'number') {
    return state.stops.find((s) => s.id === query);
  }
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  const asNum = Number(trimmed);
  if (Number.isInteger(asNum) && asNum > 0) {
    const byId = state.stops.find((s) => s.id === asNum);
    if (byId) return byId;
  }
  return state.stops.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
}

export function addStop(
  state: TransportState,
  stopId: number,
  name: string
): { ok: boolean; message: string } {
  const cleanName = name.trim();
  if (!Number.isInteger(stopId) || stopId <= 0) {
    return { ok: false, message: '[Error] Invalid Stop ID. Must be a positive integer.' };
  }
  if (!cleanName) {
    return { ok: false, message: '[Error] Bus Stop Name cannot be empty.' };
  }
  if (state.stops.some((s) => s.id === stopId)) {
    return { ok: false, message: `[Error] Duplicate Stop ID! Stop ID ${stopId} already exists.` };
  }
  if (state.stops.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
    return { ok: false, message: `[Error] Duplicate Stop Name! '${cleanName}' already exists in the network.` };
  }

  const idx = state.stops.length;
  const preset = SAMPLE_COORDS[stopId];
  const angle = (idx * 137.5 * Math.PI) / 180;
  const x = preset ? preset.x : Math.round(380 + Math.cos(angle) * 210);
  const y = preset ? preset.y : Math.round(170 + Math.sin(angle) * 115);

  state.stops.push({
    id: stopId,
    name: cleanName,
    x: Math.max(60, Math.min(700, x)),
    y: Math.max(50, Math.min(290, y)),
    neighbors: [],
  });

  return { ok: true, message: `[Success] Added Bus Stop: [${stopId}] ${cleanName}` };
}

export function deleteStop(
  state: TransportState,
  stopId: number
): { ok: boolean; message: string } {
  const target = state.stops.find((s) => s.id === stopId);
  if (!target) {
    return { ok: false, message: '[Error] Bus stop not found in the network.' };
  }
  state.stops = state.stops.filter((s) => s.id !== stopId);
  for (const s of state.stops) {
    s.neighbors = s.neighbors.filter((n) => n.destId !== stopId);
  }
  return {
    ok: true,
    message: `[Success] Bus Stop '${target.name}' (ID: ${stopId}) and its connections were deleted.`,
  };
}

export function addConnection(
  state: TransportState,
  srcId: number,
  destId: number,
  distance: number
): { ok: boolean; message: string } {
  if (srcId === destId) {
    return { ok: false, message: '[Error] Self-loops are not allowed (Source and Destination are identical).' };
  }
  if (isNaN(distance) || distance <= 0) {
    return { ok: false, message: '[Error] Invalid distance. Distance must be a positive number.' };
  }

  const u = state.stops.find((s) => s.id === srcId);
  const v = state.stops.find((s) => s.id === destId);
  if (!u || !v) {
    return { ok: false, message: '[Error] Source or destination bus stop not found.' };
  }

  const existingUV = u.neighbors.find((n) => n.destId === destId);
  const existingVU = v.neighbors.find((n) => n.destId === srcId);

  if (existingUV && existingVU) {
    existingUV.distance = distance;
    existingVU.distance = distance;
    return {
      ok: true,
      message: `[Success] Updated existing route distance: ${u.name} <-> ${v.name} (${distance} km)`,
    };
  }

  u.neighbors.push({ destId, distance });
  v.neighbors.push({ destId: srcId, distance });
  return {
    ok: true,
    message: `[Success] Added direct route: ${u.name} <-> ${v.name} (${distance} km)`,
  };
}

export function removeConnection(
  state: TransportState,
  srcId: number,
  destId: number
): { ok: boolean; message: string } {
  const u = state.stops.find((s) => s.id === srcId);
  const v = state.stops.find((s) => s.id === destId);
  if (!u || !v) {
    return { ok: false, message: '[Error] Source or destination bus stop not found.' };
  }
  const before = u.neighbors.length;
  u.neighbors = u.neighbors.filter((n) => n.destId !== destId);
  v.neighbors = v.neighbors.filter((n) => n.destId !== srcId);
  if (u.neighbors.length === before) {
    return { ok: false, message: `[Error] No direct connection exists between ${u.name} and ${v.name}.` };
  }
  return {
    ok: true,
    message: `[Success] Removed direct bus route between ${u.name} and ${v.name}.`,
  };
}

/**
 * Custom Binary Min-Heap matching heap.c
 */
class CustomMinHeap {
  private array: { stopId: number; distance: number }[] = [];
  private pos: Map<number, number> = new Map();

  public isEmpty(): boolean {
    return this.array.length === 0;
  }

  public isInHeap(stopId: number): boolean {
    const idx = this.pos.get(stopId);
    return idx !== undefined && idx >= 0 && idx < this.array.length;
  }

  public insert(stopId: number, distance: number): void {
    const idx = this.array.length;
    this.array.push({ stopId, distance });
    this.pos.set(stopId, idx);
    this.heapifyUp(idx);
  }

  public extractMin(): { stopId: number; distance: number } | undefined {
    if (this.array.length === 0) return undefined;
    const root = this.array[0];
    const last = this.array.pop()!;
    this.pos.delete(root.stopId);

    if (this.array.length > 0) {
      this.array[0] = last;
      this.pos.set(last.stopId, 0);
      this.heapifyDown(0);
    }
    return root;
  }

  public decreaseKey(stopId: number, newDistance: number): void {
    const idx = this.pos.get(stopId);
    if (idx === undefined) return;
    this.array[idx].distance = newDistance;
    this.heapifyUp(idx);
  }

  private heapifyUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.array[idx].distance < this.array[parentIdx].distance) {
        this.pos.set(this.array[idx].stopId, parentIdx);
        this.pos.set(this.array[parentIdx].stopId, idx);
        const tmp = this.array[idx];
        this.array[idx] = this.array[parentIdx];
        this.array[parentIdx] = tmp;
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private heapifyDown(idx: number): void {
    const size = this.array.length;
    let smallest = idx;
    const left = 2 * idx + 1;
    const right = 2 * idx + 2;

    if (left < size && this.array[left].distance < this.array[smallest].distance) {
      smallest = left;
    }
    if (right < size && this.array[right].distance < this.array[smallest].distance) {
      smallest = right;
    }

    if (smallest !== idx) {
      this.pos.set(this.array[smallest].stopId, idx);
      this.pos.set(this.array[idx].stopId, smallest);
      const tmp = this.array[smallest];
      this.array[smallest] = this.array[idx];
      this.array[idx] = tmp;
      this.heapifyDown(smallest);
    }
  }
}

function finalizeRoute(
  state: TransportState,
  stopIds: number[],
  totalDistance: number,
  label?: string
): RouteResult {
  const stopMap = new Map(state.stops.map((s) => [s.id, s]));
  const stopNames = stopIds.map((id) => stopMap.get(id)?.name ?? `Stop ${id}`);
  const totalStops = stopIds.length;
  const transfers = totalStops > 2 ? totalStops - 2 : 0;
  const speed = state.avgSpeedKmph > 0 ? state.avgSpeedKmph : DEFAULT_BUS_SPEED;
  const estimatedTimeMinutes = Math.round((totalDistance / speed) * 60);

  return {
    stopIds,
    stopNames,
    totalStops,
    transfers,
    totalDistance: Number(totalDistance.toFixed(2)),
    estimatedTimeMinutes,
    found: true,
    label,
  };
}

/**
 * Breadth-First Search (Minimum Stops) matching findMinStopsPathBFS in graph.c
 */
export function findMinStopsBFS(
  state: TransportState,
  srcId: number,
  destId: number
): RouteResult {
  const empty: RouteResult = {
    stopIds: [],
    stopNames: [],
    totalStops: 0,
    transfers: 0,
    totalDistance: 0,
    estimatedTimeMinutes: 0,
    found: false,
  };

  const stopMap = new Map(state.stops.map((s) => [s.id, s]));
  if (!stopMap.has(srcId) || !stopMap.has(destId)) return empty;

  if (srcId === destId) {
    return finalizeRoute(state, [srcId], 0);
  }

  const visited = new Set<number>([srcId]);
  const parent = new Map<number, number>();
  const queue: number[] = [srcId];
  let reached = false;

  while (queue.length > 0) {
    const u = queue.shift()!;
    if (u === destId) {
      reached = true;
      break;
    }
    const uStop = stopMap.get(u);
    if (!uStop) continue;
    for (const edge of uStop.neighbors) {
      if (stopMap.has(edge.destId) && !visited.has(edge.destId)) {
        visited.add(edge.destId);
        parent.set(edge.destId, u);
        queue.push(edge.destId);
      }
    }
  }

  if (!reached) return empty;

  const path: number[] = [];
  let curr: number | undefined = destId;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = parent.get(curr);
  }

  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const uStop = stopMap.get(path[i]);
    const edge = uStop?.neighbors.find((n) => n.destId === path[i + 1]);
    if (edge) totalDist += edge.distance;
  }

  return finalizeRoute(state, path, totalDist);
}

/**
 * Dijkstra's Shortest-Distance Algorithm using CustomMinHeap matching findShortestPathDijkstra in graph.c
 */
export function findShortestDijkstra(
  state: TransportState,
  srcId: number,
  destId: number,
  disabledEdge?: { u: number; v: number }
): RouteResult {
  const empty: RouteResult = {
    stopIds: [],
    stopNames: [],
    totalStops: 0,
    transfers: 0,
    totalDistance: 0,
    estimatedTimeMinutes: 0,
    found: false,
  };

  const stopMap = new Map(state.stops.map((s) => [s.id, s]));
  if (!stopMap.has(srcId) || !stopMap.has(destId)) return empty;

  if (srcId === destId) {
    return finalizeRoute(state, [srcId], 0);
  }

  const INF = 1e9;
  const dist = new Map<number, number>();
  const parent = new Map<number, number>();
  const visited = new Set<number>();
  const minHeap = new CustomMinHeap();

  for (const s of state.stops) {
    dist.set(s.id, INF);
    minHeap.insert(s.id, INF);
  }

  dist.set(srcId, 0);
  minHeap.decreaseKey(srcId, 0);

  while (!minHeap.isEmpty()) {
    const minNode = minHeap.extractMin();
    if (!minNode) break;
    const u = minNode.stopId;
    const dU = dist.get(u) ?? INF;
    if (dU >= INF) break;

    visited.add(u);
    if (u === destId) break;

    const uStop = stopMap.get(u);
    if (!uStop) continue;

    for (const edge of uStop.neighbors) {
      const v = edge.destId;
      if (
        disabledEdge &&
        ((disabledEdge.u === u && disabledEdge.v === v) ||
          (disabledEdge.u === v && disabledEdge.v === u))
      ) {
        continue;
      }

      if (stopMap.has(v) && !visited.has(v) && minHeap.isInHeap(v)) {
        const alt = dU + edge.distance;
        if (alt < (dist.get(v) ?? INF)) {
          dist.set(v, alt);
          parent.set(v, u);
          minHeap.decreaseKey(v, alt);
        }
      }
    }
  }

  const finalDist = dist.get(destId) ?? INF;
  if (finalDist >= INF) return empty;

  const path: number[] = [];
  let curr: number | undefined = destId;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = parent.get(curr);
  }

  return finalizeRoute(state, path, finalDist);
}

export function recalculateRouteWithSpeed(route: RouteResult, avgSpeedKmph: number): RouteResult {
  if (!route.found) return route;
  const speed = avgSpeedKmph > 0 ? avgSpeedKmph : DEFAULT_BUS_SPEED;
  return {
    ...route,
    estimatedTimeMinutes: Math.round((route.totalDistance / speed) * 60),
  };
}

function samePath(a: RouteResult, b: RouteResult): boolean {
  if (a.stopIds.length !== b.stopIds.length) return false;
  return a.stopIds.every((id, i) => id === b.stopIds[i]);
}

/**
 * Alternative Route Generation matching findAlternativeRoutes in graph.c
 */
export function findAlternativeRoutes(
  state: TransportState,
  srcId: number,
  destId: number,
  maxRoutes = 5
): RouteResult[] {
  const primary = findShortestDijkstra(state, srcId, destId);
  if (!primary.found) return [];

  const results: RouteResult[] = [primary];

  // Option A: Remove one edge from the primary shortest path at a time and run Dijkstra
  for (let i = 0; i < primary.stopIds.length - 1 && results.length < maxRoutes; i++) {
    const u = primary.stopIds[i];
    const v = primary.stopIds[i + 1];
    const alt = findShortestDijkstra(state, srcId, destId, { u, v });
    if (alt.found && !results.some((r) => samePath(r, alt))) {
      results.push(alt);
    }
  }

  // Option B: Bounded DFS simple path enumeration fallback
  if (results.length < maxRoutes) {
    const stopMap = new Map(state.stops.map((s) => [s.id, s]));
    const visited = new Set<number>([srcId]);
    const path: number[] = [srcId];

    const dfs = (currId: number, distSoFar: number) => {
      if (results.length >= maxRoutes) return;
      if (currId === destId) {
        const candidate = finalizeRoute(state, [...path], distSoFar);
        if (!results.some((r) => samePath(r, candidate))) {
          results.push(candidate);
        }
        return;
      }
      const uStop = stopMap.get(currId);
      if (!uStop) return;
      for (const edge of uStop.neighbors) {
        if (stopMap.has(edge.destId) && !visited.has(edge.destId)) {
          visited.add(edge.destId);
          path.push(edge.destId);
          dfs(edge.destId, distSoFar + edge.distance);
          path.pop();
          visited.delete(edge.destId);
        }
      }
    };

    dfs(srcId, 0);
  }

  results.sort((a, b) =>
    a.totalDistance !== b.totalDistance
      ? a.totalDistance - b.totalDistance
      : a.totalStops - b.totalStops
  );

  return results.map((r, i) => ({
    ...r,
    label:
      i === 0
        ? 'Available Route (Primary Shortest Route):'
        : `Available Route (Alternative Route ${i}):`,
  }));
}

export function formatRouteOutput(route: RouteResult, title = 'Available Route:'): string {
  if (!route.found) {
    return 'No route exists between the selected bus stops.';
  }
  return [
    route.label || title,
    route.stopNames.join(' -> '),
    '',
    `Total Stops: ${route.totalStops}`,
    `Transfers: ${route.transfers}`,
    `Estimated Distance: ${route.totalDistance} km`,
    `Estimated Time: ${route.estimatedTimeMinutes} minutes`,
  ].join('\n');
}

export function serializeNetworkToText(state: TransportState): string {
  const lines: string[] = [
    '# SMART PUBLIC TRANSPORT NETWORK DATA FILE',
    '# Format: STOP|<stop_id>|<stop_name>',
    '# Format: ROUTE|<src_id>|<dest_id>|<distance_km>',
    '',
  ];
  for (const s of state.stops) {
    lines.push(`STOP|${s.id}|${s.name}`);
  }
  lines.push('');
  for (const s of state.stops) {
    for (const edge of s.neighbors) {
      if (s.id < edge.destId) {
        lines.push(`ROUTE|${s.id}|${edge.destId}|${edge.distance}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

export function parseNetworkFromText(text: string): TransportState | null {
  const state: TransportState = {
    stops: [],
    avgSpeedKmph: DEFAULT_BUS_SPEED,
  };

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('STOP|')) {
      const parts = line.slice(5).split('|');
      if (parts.length >= 2) {
        const id = parseInt(parts[0].trim(), 10);
        const name = parts[1].trim();
        if (id > 0 && name) {
          addStop(state, id, name);
        }
      }
    } else if (line.startsWith('ROUTE|')) {
      const parts = line.slice(6).split('|');
      if (parts.length >= 3) {
        const u = parseInt(parts[0].trim(), 10);
        const v = parseInt(parts[1].trim(), 10);
        const d = parseFloat(parts[2].trim());
        if (u > 0 && v > 0 && d > 0) {
          addConnection(state, u, v, d);
        }
      }
    }
  }

  return state.stops.length > 0 ? state : null;
}
