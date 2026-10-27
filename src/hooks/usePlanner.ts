'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { solveState } from '@/lib/client/api';
import { applyOps } from '@/lib/ffcs/ops';
import {
  emptyState,
  type SolveResult,
  type TimetableConstraints,
  type TimetableState,
} from '@/lib/ffcs/types';

const STORAGE_KEY = 'ffcs.planner.v1';

type Snapshot = { state: TimetableState; result: SolveResult | null };

function isState(value: unknown): value is TimetableState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as TimetableState;
  return Array.isArray(candidate.requirements) && typeof candidate.constraints === 'object';
}

export function usePlanner() {
  const [state, setState] = useState<TimetableState>(emptyState);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [history, setHistory] = useState<TimetableState[]>([]);
  const [ready, setReady] = useState(false);
  const [solving, setSolving] = useState(false);

  const stateRef = useRef(state);
  const requestId = useRef(0);

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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const snapshot = JSON.parse(raw) as Snapshot;
        if (isState(snapshot.state)) {
          stateRef.current = snapshot.state;
          setState(snapshot.state);
          setResult(snapshot.result ?? null);
          if (snapshot.state.requirements.length > 0) void solve(snapshot.state);
        }
      }
    } catch {
      // A corrupt snapshot is not worth crashing over.
    }
    setReady(true);
  }, [solve]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, result }));
  }, [state, result, ready]);

  const commit = useCallback(
    (next: TimetableState) => {
      setHistory((current) => [...current.slice(-19), stateRef.current]);
      stateRef.current = next;
      setState(next);
      void solve(next);
    },
    [solve],
  );

  const add = useCallback(
    (code: string, offeringId?: string) => {
      commit(applyOps(stateRef.current, [{ op: 'add', courseCode: code, offeringId }]));
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
    setHistory((current) => [...current.slice(-19), stateRef.current]);
    stateRef.current = next;
    requestId.current += 1;
    setSolving(false);
    setState(next);
    setResult(solved);
  }, []);

  const undo = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    stateRef.current = previous;
    setState(previous);
    void solve(previous);
  }, [history, solve]);

  const reset = useCallback(() => {
    const next = emptyState();
    stateRef.current = next;
    setHistory([]);
    setState(next);
    setResult(null);
  }, []);

  return {
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
  };
}
