import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, RotateCcw, Code2 } from 'lucide-react';
import {
  TransportState,
  addStop,
  deleteStop,
  addConnection,
  removeConnection,
  resolveStop,
  serializeNetworkToText,
  parseNetworkFromText,
} from '../utils/transportEngine';
import { C_PROJECT_FILES } from '../utils/cFilesData';

interface EditNetworkPanelProps {
  netState: TransportState;
  isOpen: boolean;
  onToggleOpen: () => void;
  onUpdateNetwork: (nextState: TransportState) => void;
  onResetSample: () => void;
}

export const EditNetworkPanel: React.FC<EditNetworkPanelProps> = ({
  netState,
  isOpen,
  onToggleOpen,
  onUpdateNetwork,
  onResetSample,
}) => {
  const [newStopId, setNewStopId] = useState<string>('7');
  const [newStopName, setNewStopName] = useState<string>('Tech Park');
  const [deleteStopId, setDeleteStopId] = useState<string>('6');

  const [connFrom, setConnFrom] = useState<string>('2');
  const [connTo, setConnTo] = useState<string>('3');
  const [connDist, setConnDist] = useState<string>('4');

  const [networkFileText, setNetworkFileText] = useState<string>(() =>
    serializeNetworkToText(netState)
  );
  const [showCSource, setShowCSource] = useState<boolean>(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const cloneState = (s: TransportState): TransportState => ({
    avgSpeedKmph: s.avgSpeedKmph,
    stops: s.stops.map((st) => ({
      ...st,
      neighbors: st.neighbors.map((n) => ({ ...n })),
    })),
  });

  const showFriendlyMessage = (rawMsg: string, ok: boolean) => {
    const clean = rawMsg
      .replace(/^\[(Error|Success)\]\s*/i, '')
      .replace(/Duplicate Stop ID!/i, 'That Stop ID is already in use.')
      .replace(/Duplicate Stop Name!/i, 'That stop name already exists.');
    setFeedback({
      type: ok ? 'success' : 'error',
      message: clean,
    });
  };

  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    const next = cloneState(netState);
    const idNum = parseInt(newStopId, 10);
    const res = addStop(next, idNum, newStopName);
    if (res.ok) {
      onUpdateNetwork(next);
      setNetworkFileText(serializeNetworkToText(next));
      setNewStopId(String(idNum + 1));
      setNewStopName('');
    }
    showFriendlyMessage(res.message, res.ok);
  };

  const handleDeleteStop = (e: React.FormEvent) => {
    e.preventDefault();
    const next = cloneState(netState);
    const idNum = parseInt(deleteStopId, 10);
    const res = deleteStop(next, idNum);
    if (res.ok) {
      onUpdateNetwork(next);
      setNetworkFileText(serializeNetworkToText(next));
      if (next.stops.length > 0) {
        setDeleteStopId(String(next.stops[next.stops.length - 1].id));
      }
    }
    showFriendlyMessage(res.message, res.ok);
  };

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const next = cloneState(netState);
    const u = resolveStop(next, connFrom);
    const v = resolveStop(next, connTo);
    if (!u || !v) {
      showFriendlyMessage('Please select two existing stops to connect.', false);
      return;
    }
    const dist = parseFloat(connDist);
    const res = addConnection(next, u.id, v.id, dist);
    if (res.ok) {
      onUpdateNetwork(next);
      setNetworkFileText(serializeNetworkToText(next));
    }
    showFriendlyMessage(res.message, res.ok);
  };

  const handleRemoveConnection = () => {
    const next = cloneState(netState);
    const u = resolveStop(next, connFrom);
    const v = resolveStop(next, connTo);
    if (!u || !v) {
      showFriendlyMessage('Please select two existing stops.', false);
      return;
    }
    const res = removeConnection(next, u.id, v.id);
    if (res.ok) {
      onUpdateNetwork(next);
      setNetworkFileText(serializeNetworkToText(next));
    }
    showFriendlyMessage(res.message, res.ok);
  };

  const handleSaveToText = () => {
    const serialized = serializeNetworkToText(netState);
    setNetworkFileText(serialized);
    setFeedback({
      type: 'success',
      message: 'Saved current stops and connections to network.txt format below.',
    });
  };

  const handleLoadFromText = () => {
    const parsed = parseNetworkFromText(networkFileText);
    if (parsed) {
      parsed.avgSpeedKmph = netState.avgSpeedKmph;
      onUpdateNetwork(parsed);
      setFeedback({
        type: 'success',
        message: `Loaded ${parsed.stops.length} stops from network.txt.`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: 'Could not load network.txt. Make sure at least one valid STOP|id|name line exists.',
      });
    }
  };

  const currentFile = C_PROJECT_FILES[selectedFileIndex];

  return (
    <section
      id="edit-network"
      aria-label="Edit network"
      className="pt-8 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Collapsible Header Button */}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Edit network & C project files
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add or remove stops and connections, save or load network.txt, or inspect the original C source files
            </p>
          </div>
          <span className="ml-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </button>

        {isOpen && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
            {/* Friendly Status Message */}
            {feedback && (
              <div
                role="status"
                className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <span>{feedback.message}</span>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-xs underline opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Add or Delete a Stop */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Add or delete a stop
                </h3>

                <form onSubmit={handleAddStop} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label
                        htmlFor="edit-stop-id"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Stop ID
                      </label>
                      <input
                        id="edit-stop-id"
                        type="number"
                        value={newStopId}
                        onChange={(e) => setNewStopId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="edit-stop-name"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Stop name
                      </label>
                      <input
                        id="edit-stop-name"
                        type="text"
                        value={newStopName}
                        onChange={(e) => setNewStopName(e.target.value)}
                        placeholder="e.g. Tech Park"
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add stop
                  </button>
                </form>

                <form
                  onSubmit={handleDeleteStop}
                  className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <label
                    htmlFor="delete-stop-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Remove an existing stop
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="delete-stop-select"
                      value={deleteStopId}
                      onChange={(e) => setDeleteStopId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      {netState.stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.id} {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="py-1.5 px-3 text-xs font-medium bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Add or Remove a Connection */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Add or remove a connection
                </h3>

                <form onSubmit={handleAddConnection} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="conn-from-select"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        First stop
                      </label>
                      <select
                        id="conn-from-select"
                        value={connFrom}
                        onChange={(e) => setConnFrom(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        {netState.stops.map((s) => (
                          <option key={s.id} value={s.id}>
                            #{s.id} {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="conn-to-select"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Second stop
                      </label>
                      <select
                        id="conn-to-select"
                        value={connTo}
                        onChange={(e) => setConnTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        {netState.stops.map((s) => (
                          <option key={s.id} value={s.id}>
                            #{s.id} {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="conn-dist-input"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Distance (km)
                    </label>
                    <input
                      id="conn-dist-input"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={connDist}
                      onChange={(e) => setConnDist(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Save connection
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveConnection}
                      className="py-2 px-3 text-xs font-medium bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </form>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onResetSample();
                      setFeedback({
                        type: 'success',
                        message: 'Restored the default 6-stop, 7-connection sample network.',
                      });
                    }}
                    className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to default sample network
                  </button>
                </div>
              </div>

              {/* 3. Save / Load network.txt */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Save or load network.txt
                  </h3>
                  <label
                    htmlFor="network-txt-editor"
                    className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2"
                  >
                    Plain text format used by fileio.c
                  </label>
                  <textarea
                    id="network-txt-editor"
                    rows={6}
                    value={networkFileText}
                    onChange={(e) => setNetworkFileText(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToText}
                    className="flex-1 py-2 px-3 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Export current
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadFromText}
                    className="flex-1 py-2 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Load network.txt
                  </button>
                </div>
              </div>
            </div>

            {/* Optional C Source Code Drawer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCSource((v) => !v)}
                className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                {showCSource
                  ? 'Hide C source files'
                  : `Browse original C source files (${C_PROJECT_FILES.length} files)`}
              </button>

              {showCSource && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-3 flex flex-wrap lg:flex-col gap-1">
                    {C_PROJECT_FILES.map((file, idx) => (
                      <button
                        key={file.name}
                        type="button"
                        onClick={() => setSelectedFileIndex(idx)}
                        className={`text-left px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          selectedFileIndex === idx
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                  <div className="lg:col-span-9">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                      <strong>{currentFile.name}</strong> — {currentFile.description}
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-[380px]">
                      <code>{currentFile.content}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
