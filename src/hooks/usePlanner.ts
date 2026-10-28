'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { solveState } from '@/lib/client/api';
import { applyOps } from '@/lib/ffcs/ops';
import {
  emptyState,
  type CustomCourse,
  type SolveResult,
  type TimetableConstraints,
  type TimetableState,
} from '@/lib/ffcs/types';

const STORAGE_KEY = 'ffcs.planner.v2';
const LEGACY_KEY = 'ffcs.planner.v1';

export type SavedTimetable = { id: string; name: string; state: TimetableState };

type Snapshot = { timetables: SavedTimetable[]; activeId: string };
type HistoryEntry = { id: string; state: TimetableState };

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `t-${Math.random().toString(36).slice(2)}`;

const makeTimetable = (name: string, state: TimetableState = emptyState()): SavedTimetable => ({
  id: makeId(),
  name,
  state,
});

function isState(value: unknown): value is TimetableState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as TimetableState;
  return Array.isArray(candidate.requirements) && typeof candidate.constraints === 'object';
}

function parseSnapshot(raw: string): Snapshot | null {
  try {
    const parsed = JSON.parse(raw) as Snapshot;
    if (!Array.isArray(parsed.timetables)) return null;

    const timetables = parsed.timetables.filter(
      (item) => item && typeof item.id === 'string' && typeof item.name === 'string' && isState(item.state),
    );
    if (timetables.length === 0) return null;

    const activeId = timetables.some((item) => item.id === parsed.activeId)
      ? parsed.activeId
      : timetables[0].id;

    return { timetables, activeId };
  } catch {
    return null;
  }
}

export function usePlanner() {
  const [timetables, setTimetables] = useState<SavedTimetable[]>(() => [makeTimetable('Default')]);
  const [activeId, setActiveId] = useState('');
  const [result, setResult] = useState<SolveResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [solving, setSolving] = useState(false);

  const active = timetables.find((item) => item.id === activeId) ?? timetables[0];
  const state = active.state;

  const stateRef = useRef(state);
  const activeIdRef = useRef(active.id);
  const requestId = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    activeIdRef.current = active.id;
  }, [state, active.id]);

  const solve = useCallback(async (next: TimetableState) => {
    const id = requestId.current + 1;
    requestId.current = id;
    setSolving(true);

    try {
      const solved = await solveState(next);
      if (requestId.current === id) setResult(solved);
    } catch {
      // Keep the previous arrangement; a failed solve must not blank the grid.
    } finally {
      if (requestId.current === id) setSolving(false);
    }
  }, []);

  useEffect(() => {
    try {
      const snapshot = parseSnapshot(localStorage.getItem(STORAGE_KEY) ?? '');
      if (snapshot) {
        const target =
          snapshot.timetables.find((item) => item.id === snapshot.activeId) ?? snapshot.timetables[0];
        setTimetables(snapshot.timetables);
        setActiveId(target.id);
        stateRef.current = target.state;
        activeIdRef.current = target.id;
        if (target.state.requirements.length > 0) void solve(target.state);
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as { state?: unknown };
          if (isState(parsed.state)) {
            const migrated = makeTimetable('Default', parsed.state);
            setTimetables([migrated]);
            setActiveId(migrated.id);
            stateRef.current = parsed.state;
            activeIdRef.current = migrated.id;
            if (parsed.state.requirements.length > 0) void solve(parsed.state);
          }
        }
      }
    } catch {
      // A corrupt snapshot is not worth crashing over.
    }
    setReady(true);
  }, [solve]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timetables, activeId: active.id }));
  }, [timetables, active.id, ready]);

  const commit = useCallback(
    (next: TimetableState) => {
      const id = activeIdRef.current;
      setHistory((current) => [...current.slice(-19), { id, state: stateRef.current }]);
      stateRef.current = next;
      setTimetables((list) =>
        list.map((item) => (item.id === id ? { ...item, state: next } : item)),
      );
      void solve(next);
    },
    [solve],
  );

  const activate = useCallback(
    (target: SavedTimetable) => {
      setActiveId(target.id);
      activeIdRef.current = target.id;
      stateRef.current = target.state;
      setResult(null);
      if (target.state.requirements.length > 0) void solve(target.state);
    },
    [solve],
  );

  const add = useCallback(
    (code: string, offeringId?: string, slots?: string[], custom?: CustomCourse) => {
      commit(
        applyOps(stateRef.current, [{ op: 'add', courseCode: code, offeringId, slots, custom }]),
      );
    },
    [commit],
  );

  const remove = useCallback(
    (code: string) => {
      commit(applyOps(stateRef.current, [{ op: 'remove', courseCode: code }]));
    },
    [commit],
  );

  const setConstraints = useCallback(
    (constraints: Partial<TimetableConstraints>) => {
      commit(applyOps(stateRef.current, [{ op: 'constraints', constraints }]));
    },
    [commit],
  );

  const applyAgent = useCallback((next: TimetableState, solved: SolveResult) => {
    const id = activeIdRef.current;
    const changed = JSON.stringify(next) !== JSON.stringify(stateRef.current);
    if (changed) setHistory((current) => [...current.slice(-19), { id, state: stateRef.current }]);

    stateRef.current = next;
    requestId.current += 1;
    setSolving(false);
    setTimetables((list) => list.map((item) => (item.id === id ? { ...item, state: next } : item)));
    setResult(solved);
  }, []);

  const selectTimetable = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return;
      const target = timetables.find((item) => item.id === id);
      if (target) activate(target);
    },
    [timetables, activate],
  );

  const createTimetable = useCallback(() => {
    const created = makeTimetable(`Plan ${timetables.length + 1}`);
    setTimetables((list) => [...list, created]);
    activate(created);
  }, [timetables.length, activate]);

  const duplicateTimetable = useCallback(
    (id: string) => {
      const source = timetables.find((item) => item.id === id);
      if (!source) return;

      const copy = makeTimetable(`${source.name} copy`, structuredClone(source.state));
      setTimetables((list) => [...list, copy]);
      activate(copy);
    },
    [timetables, activate],
  );

  const renameTimetable = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setTimetables((list) => list.map((item) => (item.id === id ? { ...item, name: trimmed } : item)));
  }, []);

  const deleteTimetable = useCallback(
    (id: string) => {
      if (timetables.length === 1) {
        const fresh = makeTimetable('Default');
        setTimetables([fresh]);
        setHistory([]);
        activate(fresh);
        return;
      }

      const remaining = timetables.filter((item) => item.id !== id);
      setTimetables(remaining);
      if (id === activeIdRef.current) activate(remaining[0]);
    },
    [timetables, activate],
  );

  const undo = useCallback(() => {
    const entry = history[history.length - 1];
    if (!entry) return;

    setHistory((current) => current.slice(0, -1));
    const target = timetables.find((item) => item.id === entry.id);
    if (!target) return;

    setActiveId(target.id);
    activeIdRef.current = target.id;
    stateRef.current = entry.state;
    setTimetables((list) =>
      list.map((item) => (item.id === entry.id ? { ...item, state: entry.state } : item)),
    );
    void solve(entry.state);
  }, [history, timetables, solve]);

  const reset = useCallback(() => {
    const next = emptyState();
    const id = activeIdRef.current;
    stateRef.current = next;
    setHistory([]);
    setTimetables((list) => list.map((item) => (item.id === id ? { ...item, state: next } : item)));
    setResult(null);
  }, []);

  return {
    timetables,
    activeId: active.id,
    activeName: active.name,
    state,
    result,
    ready,
    solving,
    canUndo: history.length > 0,
    add,
    remove,
    setConstraints,
    applyAgent,
    undo,
    reset,
    selectTimetable,
    createTimetable,
    duplicateTimetable,
    renameTimetable,
    deleteTimetable,
  };
}
