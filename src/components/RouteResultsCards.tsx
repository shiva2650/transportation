import React from 'react';
import { RouteResult } from '../utils/transportEngine';

interface RouteResultsCardsProps {
  shortestRoute: RouteResult | null;
  fewestStopsRoute: RouteResult | null;
  alternativeRoutes: RouteResult[];
  activeRoute: RouteResult | null;
  selectedAltIndex: number;
  onSelectRoute: (route: RouteResult, altIdx?: number) => void;
}

export const RouteResultsCards: React.FC<RouteResultsCardsProps> = ({
  shortestRoute,
  fewestStopsRoute,
  alternativeRoutes,
  activeRoute,
  selectedAltIndex,
  onSelectRoute,
}) => {
  const isSameRoute = (a: RouteResult | null, b: RouteResult | null) => {
    if (!a || !b || !a.found || !b.found) return false;
    return a.stopIds.join('-') === b.stopIds.join('-');
  };

  // Alternative routes excluding the primary shortest route (index 0)
  const secondaryAlts =
    alternativeRoutes.length > 1 ? alternativeRoutes.slice(1) : alternativeRoutes;
  const currentAlt =
    secondaryAlts[selectedAltIndex] ?? secondaryAlts[0] ?? null;

  const dijkstraSelected = isSameRoute(activeRoute, shortestRoute);
  const bfsSelected =
    isSameRoute(activeRoute, fewestStopsRoute) && !dijkstraSelected;
  const altSelected =
    currentAlt &&
    isSameRoute(activeRoute, currentAlt) &&
    !dijkstraSelected &&
    !bfsSelected;

  if (!shortestRoute?.found && !fewestStopsRoute?.found) {
    return (
      <div
        role="alert"
        className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 text-amber-900 dark:text-amber-200 text-sm"
      >
        No bus route connects the selected stops. Try choosing a different stop or adding a connection in the Edit network panel below.
      </div>
    );
  }

  return (
    <section aria-label="Route Comparison Results" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recommended Routes
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click any card to highlight its path on the map
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Shortest Distance (Dijkstra) */}
        {shortestRoute && shortestRoute.found && (
          <div
            data-testid="card-shortest-distance"
            onClick={() => onSelectRoute(shortestRoute)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRoute(shortestRoute);
              }
            }}
            className={`text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              dijkstraSelected
                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-400 ring-1 ring-blue-600 dark:ring-blue-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Shortest distance
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Dijkstra’s algorithm
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {shortestRoute.stopNames.join(' → ')}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Distance
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {shortestRoute.totalDistance} km
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Estimated time
                </span>
                <span
                  data-testid="dijkstra-time"
                  className="font-semibold text-blue-600 dark:text-blue-400"
                >
                  {shortestRoute.estimatedTimeMinutes} min
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Stops
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {shortestRoute.totalStops}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Transfers
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {shortestRoute.transfers}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card 2: Fewest Stops (BFS) */}
        {fewestStopsRoute && fewestStopsRoute.found && (
          <div
            data-testid="card-fewest-stops"
            onClick={() => onSelectRoute(fewestStopsRoute)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRoute(fewestStopsRoute);
              }
            }}
            className={`text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              bfsSelected
                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-400 ring-1 ring-blue-600 dark:ring-blue-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Fewest stops
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Breadth-First Search
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {fewestStopsRoute.stopNames.join(' → ')}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Distance
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {fewestStopsRoute.totalDistance} km
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Estimated time
                </span>
                <span
                  data-testid="bfs-time"
                  className="font-semibold text-blue-600 dark:text-blue-400"
                >
                  {fewestStopsRoute.estimatedTimeMinutes} min
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Stops
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {fewestStopsRoute.totalStops}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Transfers
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {fewestStopsRoute.transfers}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Alternative Routes */}
        <div
          data-testid="card-alternative-routes"
          onClick={() => {
            if (currentAlt) onSelectRoute(currentAlt, selectedAltIndex);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && currentAlt) {
              e.preventDefault();
              onSelectRoute(currentAlt, selectedAltIndex);
            }
          }}
          className={`text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            altSelected
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 dark:border-blue-400 ring-1 ring-blue-600 dark:ring-blue-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Alternative routes
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Detour options
              </span>
            </div>

            {secondaryAlts.length > 1 && (
              <div
                className="mt-2.5 flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {secondaryAlts.map((alt, idx) => (
                  <button
                    key={alt.stopIds.join('-')}
                    type="button"
                    onClick={() => onSelectRoute(alt, idx)}
                    className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      selectedAltIndex === idx
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Alt {idx + 1} · {alt.totalDistance} km
                  </button>
                ))}
              </div>
            )}

            {currentAlt ? (
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {currentAlt.stopNames.join(' → ')}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Only a single direct route exists between these stops.
              </p>
            )}
          </div>

          {currentAlt && (
            <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Distance
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentAlt.totalDistance} km
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Estimated time
                </span>
                <span
                  data-testid="alt-time"
                  className="font-semibold text-blue-600 dark:text-blue-400"
                >
                  {currentAlt.estimatedTimeMinutes} min
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Stops
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {currentAlt.totalStops}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Transfers
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {currentAlt.transfers}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
