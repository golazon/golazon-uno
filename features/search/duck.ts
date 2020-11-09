import { Dispatch } from "react";
import { delay, terminateDelay } from "common/util/delay";
import * as History from "common/util/history";
import api from "common/api";
import { uniqResults } from "./util";
import { SearchResult } from "./types";

type State = {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string;
  selectedIndex: number;
};

const SEARCH_START = "SEARCH_START";
const SEARCH_SUCCESS = "SEARCH_SUCCESS";
const SEARCH_ERROR = "SEARCH_ERROR";
const RESULTS_CHANGE = "RESULTS_CHANGED";
const QUERY_CHANGE = "QUERY_CHANGED";
const SELECTED_INDEX_INC = "SELECTED_INDEX_INC";
const SELECTED_INDEX_DEC = "SELECTED_INDEX_DEC";
const SELECTED_INDEX_RESET = "SELECTED_INDEX_RESET";

type Action = {
  type: string;
  payload?: Partial<State>;
};

export const initialState: State = {
  query: "",
  results: [],
  loading: false,
  error: "",
  selectedIndex: -1,
};

// Reducer
export function reducer(state: State, { type, payload }: Action) {
  if (type === SEARCH_START) {
    return { ...state, loading: true };
  }

  if (type === "SEARCH_SUCCESS") {
    const { results } = payload;
    return {
      ...state,
      results: uniqResults(results),
      loading: false,
      error: initialState.error,
      selectedIndex: initialState.selectedIndex,
    };
  }

  if (type === SEARCH_ERROR) {
    const { error } = payload;
    return {
      ...state,
      error,
      loading: false,
      results: initialState.results,
      selectedIndex: initialState.selectedIndex,
    };
  }

  if (type === QUERY_CHANGE) {
    const { query } = payload;
    return { ...state, query };
  }

  if (type === RESULTS_CHANGE) {
    const { results } = payload;
    return {
      ...state,
      results: uniqResults(results),
      loading: false,
      error: initialState.error,
      selectedIndex: initialState.selectedIndex,
    };
  }

  if (type === SELECTED_INDEX_INC) {
    let nextIndex = state.selectedIndex;
    nextIndex = nextIndex < state.results.length - 1 ? nextIndex + 1 : -1;
    return { ...state, selectedIndex: nextIndex };
  }

  if (type === SELECTED_INDEX_DEC) {
    let nextIndex = state.selectedIndex;
    nextIndex = nextIndex >= 0 ? nextIndex - 1 : state.results.length - 1;
    return { ...state, selectedIndex: nextIndex };
  }

  if (type === SELECTED_INDEX_RESET) {
    return { ...state, selectedIndex: initialState.selectedIndex };
  }

  return state;
}

function searchStart() {
  return { type: SEARCH_START };
}

function searchSuccess(results: State["results"]) {
  return { type: SEARCH_SUCCESS, payload: { results } };
}

function searchError(error: State["error"]) {
  return { type: SEARCH_ERROR, payload: { error } };
}

export function queryChange(query: State["query"]) {
  return { type: QUERY_CHANGE, payload: { query } };
}

export function resultsChange(results: State["results"]) {
  return { type: SEARCH_SUCCESS, payload: { results } };
}

export function incSelectedIndex() {
  return { type: SELECTED_INDEX_INC };
}

export function decSelectedIndex() {
  return { type: SELECTED_INDEX_DEC };
}

export function resetSelectedIndex() {
  return { type: SELECTED_INDEX_RESET };
}

const MAX_RESULTS = 20;

export function asyncSearch(query: string) {
  return (dispatch: Dispatch<unknown>) => {
    terminateDelay();

    // all history results
    if (query.length === 0) {
      const historyResults = History.all().slice(0, MAX_RESULTS);
      dispatch(resultsChange(historyResults));
      return;
    }

    // search in history
    const filteredHistoryResults = History.search(query).slice(0, MAX_RESULTS);
    dispatch(resultsChange(filteredHistoryResults));

    // search full database
    if (filteredHistoryResults.length < MAX_RESULTS) {
      dispatch(searchStart());

      delay(0.3, () => {
        api(`competitions?q=${query}`)
          .then((results) => {
            const mergedResults = filteredHistoryResults
              .concat(results)
              .slice(0, MAX_RESULTS);
            dispatch(searchSuccess(mergedResults));
          })
          .catch((e) => {
            dispatch(searchError(e.message));
          });
      });
    }
  };
}
