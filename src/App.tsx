import React, { useState } from 'react';
import { Bus, Navigation } from 'lucide-react';
import {
  TransportState,
  RouteResult,
  createSampleTransportState,
  findShortestDijkstra,
  findMinStopsBFS,
  findAlternativeRoutes,
  recalculateRouteWithSpeed,
} from './utils/transportEngine';
import { NetworkGraphCanvas } from './components/NetworkGraphCanvas';
import { RouteResultsCards } from './components/RouteResultsCards';
import { HowItWorksSection } from './components/HowItWorksSection';
import { EditNetworkPanel } from './components/EditNetworkPanel';

export default function App() {
  const [netState, setNetState] = useState<TransportState>(() =>
    createSampleTransportState()
  );

  // Selected From / To Stop IDs
  const [fromStopId, setFromStopId] = useState<number>(1); // College
  const [toStopId, setToStopId] = useState<number>(6); // City Center

  // Computed Routes
  const [shortestRoute, setShortestRoute] = useState<RouteResult | null>(() => {
    const initial = createSampleTransportState();
    return findShortestDijkstra(initial, 1, 6);
  });
  const [fewestStopsRoute, setFewestStopsRoute] = useState<RouteResult | null>(
    () => {
      const initial = createSampleTransportState();
      return findMinStopsBFS(initial, 1, 6);
    }
  );
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteResult[]>(
    () => {
      const initial = createSampleTransportState();
      return findAlternativeRoutes(initial, 1, 6, 5);
    }
  );

  // Currently highlighted route on the map
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(() => {
    const initial = createSampleTransportState();
    return findShortestDijkstra(initial, 1, 6);
  });
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(0);

  // Collapsible Edit Network panel state (collapsed by default)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  // Recompute all three route results for a given state and From/To pair
  const computeRoutes = (
    state: TransportState,
    srcId: number,
    destId: number
  ) => {
    const dijkstra = findShortestDijkstra(state, srcId, destId);
    const bfs = findMinStopsBFS(state, srcId, destId);
    const alts = findAlternativeRoutes(state, srcId, destId, 5);

    setShortestRoute(dijkstra);
    setFewestStopsRoute(bfs);
    setAlternativeRoutes(alts);
    setSelectedAltIndex(0);
    setActiveRoute(dijkstra.found ? dijkstra : bfs.found ? bfs : null);
  };

  const handleFindRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    computeRoutes(netState, fromStopId, toStopId);
  };

  // Clicking a stop circle on the map sets From or To and updates routes
  const handleSelectStopOnMap = (clickedStopId: number) => {
    if (clickedStopId === fromStopId) return;
    setToStopId(clickedStopId);
    computeRoutes(netState, fromStopId, clickedStopId);
  };

  // Live Average Bus Speed slider handler
  const handleSpeedChange = (newSpeed: number) => {
    const updatedState: TransportState = {
      ...netState,
      avgSpeedKmph: newSpeed,
    };
    setNetState(updatedState);

    setShortestRoute((prev) =>
      prev ? recalculateRouteWithSpeed(prev, newSpeed) : null
    );
    setFewestStopsRoute((prev) =>
      prev ? recalculateRouteWithSpeed(prev, newSpeed) : null
    );
    setAlternativeRoutes((prev) =>
      prev.map((r) => recalculateRouteWithSpeed(r, newSpeed))
    );
    setActiveRoute((prev) =>
      prev ? recalculateRouteWithSpeed(prev, newSpeed) : null
    );
  };

  const handleNetworkUpdate = (nextState: TransportState) => {
    setNetState(nextState);
    const validFrom = nextState.stops.some((s) => s.id === fromStopId)
      ? fromStopId
      : (nextState.stops[0]?.id ?? 1);
    const validTo = nextState.stops.some((s) => s.id === toStopId)
      ? toStopId
      : (nextState.stops[nextState.stops.length - 1]?.id ?? 1);
    setFromStopId(validFrom);
    setToStopId(validTo);
    computeRoutes(nextState, validFrom, validTo);
  };

  const handleResetSample = () => {
    const sample = createSampleTransportState();
    sample.avgSpeedKmph = netState.avgSpeedKmph;
    setNetState(sample);
    setFromStopId(1);
    setToStopId(6);
    computeRoutes(sample, 1, 6);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 1. Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <a
            href="#planner"
            className="flex items-center gap-2.5 text-slate-900 dark:text-white font-semibold text-base tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
          >
            <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Smart Public Transport Route Planner</span>
          </a>

          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#planner"
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors"
            >
              Planner
            </a>
            <a
              href="#how-it-works"
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors"
            >
              How it works
            </a>
            <a
              href="#edit-network"
              onClick={() => setIsEditOpen(true)}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors"
            >
              Edit network
            </a>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 flex-1">
        {/* 2. Hero + Planner + Map */}
        <section id="planner" aria-label="Route Planner" className="space-y-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Find the best bus route between two stops
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
              Choose your starting stop and destination to compare the shortest distance, the fewest stops, and alternative routes on the map.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Planner Form Card */}
            <form
              onSubmit={handleFindRouteSubmit}
              className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="from-stop-select"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    From
                  </label>
                  <select
                    id="from-stop-select"
                    value={fromStopId}
                    onChange={(e) => {
                      const nextFrom = Number(e.target.value);
                      setFromStopId(nextFrom);
                      computeRoutes(netState, nextFrom, toStopId);
                    }}
                    className="w-full px-3.5 py-2.5 text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {netState.stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Stop #{s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="to-stop-select"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    To
                  </label>
                  <select
                    id="to-stop-select"
                    value={toStopId}
                    onChange={(e) => {
                      const nextTo = Number(e.target.value);
                      setToStopId(nextTo);
                      computeRoutes(netState, fromStopId, nextTo);
                    }}
                    className="w-full px-3.5 py-2.5 text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {netState.stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Stop #{s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <Navigation className="w-4 h-4" />
                  Find Route
                </button>
              </div>

              {/* Average Bus Speed Slider Control */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="avg-bus-speed-slider"
                    className="font-medium text-slate-600 dark:text-slate-400"
                  >
                    Average bus speed
                  </label>
                  <span
                    data-testid="current-bus-speed"
                    className="font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {netState.avgSpeedKmph} km/h
                  </span>
                </div>
                <input
                  id="avg-bus-speed-slider"
                  type="range"
                  min={10}
                  max={80}
                  step={1}
                  value={netState.avgSpeedKmph}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  aria-label="Average bus speed in km/h"
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>10 km/h</span>
                  <span>25 km/h (Default)</span>
                  <span>80 km/h</span>
                </div>
              </div>
            </form>

            {/* Right Network Map */}
            <div className="lg:col-span-8">
              <NetworkGraphCanvas
                stops={netState.stops}
                activeRoute={activeRoute}
                selectedSourceId={fromStopId}
                selectedDestId={toStopId}
                onSelectStop={handleSelectStopOnMap}
              />
            </div>
          </div>
        </section>

        {/* 3. Results Cards */}
        <RouteResultsCards
          shortestRoute={shortestRoute}
          fewestStopsRoute={fewestStopsRoute}
          alternativeRoutes={alternativeRoutes}
          activeRoute={activeRoute}
          selectedAltIndex={selectedAltIndex}
          onSelectRoute={(route, altIdx) => {
            setActiveRoute(route);
            if (altIdx !== undefined) {
              setSelectedAltIndex(altIdx);
            }
          }}
        />

        {/* 4. How it works */}
        <HowItWorksSection
          netState={netState}
          sourceId={fromStopId}
          destId={toStopId}
        />

        {/* 5. Edit network (collapsed by default) */}
        <EditNetworkPanel
          netState={netState}
          isOpen={isEditOpen}
          onToggleOpen={() => setIsEditOpen((v) => !v)}
          onUpdateNetwork={handleNetworkUpdate}
          onResetSample={handleResetSample}
        />
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Advanced Data Structures PBL
          </span>
          <span>
            Built with C99 · React · TypeScript · Tailwind CSS · Graph Adjacency List, Binary Min-Heap, FIFO Queue & Separate-Chaining Hash Table
          </span>
        </div>
      </footer>
    </div>
  );
}
