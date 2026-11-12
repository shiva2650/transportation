import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSampleTransportState,
  findShortestDijkstra,
  findMinStopsBFS,
  findAlternativeRoutes,
  addStop,
  addConnection,
  resolveStop,
  serializeNetworkToText,
  parseNetworkFromText,
} from './transportEngine';

test('Shortest-distance route from College (1) to City Center (6) via Dijkstra + Min-Heap', () => {
  const state = createSampleTransportState();
  const route = findShortestDijkstra(state, 1, 6);

  assert.equal(route.found, true);
  assert.deepEqual(route.stopNames, ['College', 'Market', 'Railway Station', 'City Center']);
  assert.equal(route.totalStops, 4);
  assert.equal(route.transfers, 2);
  assert.equal(route.totalDistance, 10);
  assert.equal(route.estimatedTimeMinutes, 24);
});

test('Minimum-stops route from College (1) to City Center (6) via BFS + Queue', () => {
  const state = createSampleTransportState();
  const route = findMinStopsBFS(state, 1, 6);

  assert.equal(route.found, true);
  assert.deepEqual(route.stopNames, ['College', 'Library', 'Hospital', 'City Center']);
  assert.equal(route.totalStops, 4);
  assert.equal(route.transfers, 2);
  assert.equal(route.totalDistance, 13);
  assert.equal(route.estimatedTimeMinutes, 31);
});

test('Alternative routes from College (1) to City Center (6) return at least 3 distinct routes', () => {
  const state = createSampleTransportState();
  const alts = findAlternativeRoutes(state, 1, 6, 5);

  assert.equal(alts.length, 4);
  assert.equal(alts[0].totalDistance, 10);
  assert.equal(alts[1].totalDistance, 13);
  assert.equal(alts[2].totalDistance, 15);
  assert.equal(alts[3].totalDistance, 18);
});

test('Validation guards duplicate stops, self-loops, negative weights, and unreachable destinations', () => {
  const state = createSampleTransportState();

  const dupId = addStop(state, 1, 'New Stop');
  assert.equal(dupId.ok, false);

  const dupName = addStop(state, 99, 'college');
  assert.equal(dupName.ok, false);

  const selfLoop = addConnection(state, 1, 1, 4);
  assert.equal(selfLoop.ok, false);

  const negDist = addConnection(state, 1, 6, -3);
  assert.equal(negDist.ok, false);

  const isolated = addStop(state, 7, 'Airport');
  assert.equal(isolated.ok, true);

  const unreachable = findShortestDijkstra(state, 1, 7);
  assert.equal(unreachable.found, false);
});

test('Hash table resolution and network serialization/deserialization', () => {
  const state = createSampleTransportState();
  assert.equal(resolveStop(state, 'hospital')?.id, 4);
  assert.equal(resolveStop(state, '5')?.name, 'Railway Station');

  const text = serializeNetworkToText(state);
  const parsed = parseNetworkFromText(text);
  assert.ok(parsed);
  assert.equal(parsed.stops.length, 6);
});

test('Updating average bus speed dynamically recalculates travel time for Dijkstra and BFS routes', () => {
  const state = createSampleTransportState();
  state.avgSpeedKmph = 50; // Double the default 25 km/h speed

  const dijkstraRoute = findShortestDijkstra(state, 1, 6); // 10 km at 50 km/h -> 12 mins
  assert.equal(dijkstraRoute.totalDistance, 10);
  assert.equal(dijkstraRoute.estimatedTimeMinutes, 12);

  const bfsRoute = findMinStopsBFS(state, 1, 6); // 13 km at 50 km/h -> 16 mins (15.6 rounded)
  assert.equal(bfsRoute.totalDistance, 13);
  assert.equal(bfsRoute.estimatedTimeMinutes, 16);
});

