/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as activityLogs from "../activityLogs.js";
import type * as config from "../config.js";
import type * as cronTasks from "../cronTasks.js";
import type * as crons from "../crons.js";
import type * as cryptoAgent from "../cryptoAgent.js";
import type * as dashboardActions from "../dashboardActions.js";
import type * as demoData from "../demoData.js";
import type * as lib_positionEntries from "../lib/positionEntries.js";
import type * as llmActions from "../llmActions.js";
import type * as llmCosts from "../llmCosts.js";
import type * as orderApprovals from "../orderApprovals.js";
import type * as overnight from "../overnight.js";
import type * as policy_engine from "../policy/engine.js";
import type * as portfolio from "../portfolio.js";
import type * as positionHistory from "../positionHistory.js";
import type * as positions from "../positions.js";
import type * as providers_alpaca from "../providers/alpaca.js";
import type * as providers_llm from "../providers/llm.js";
import type * as providers_technicals from "../providers/technicals.js";
import type * as rawEvents from "../rawEvents.js";
import type * as riskState from "../riskState.js";
import type * as scraper from "../scraper.js";
import type * as secEdgar from "../secEdgar.js";
import type * as signals from "../signals.js";
import type * as signalsQueries from "../signalsQueries.js";
import type * as staleness from "../staleness.js";
import type * as status from "../status.js";
import type * as technicals from "../technicals.js";
import type * as trades from "../trades.js";
import type * as tradingActions from "../tradingActions.js";
import type * as tradingAgent from "../tradingAgent.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  activityLogs: typeof activityLogs;
  config: typeof config;
  cronTasks: typeof cronTasks;
  crons: typeof crons;
  cryptoAgent: typeof cryptoAgent;
  dashboardActions: typeof dashboardActions;
  demoData: typeof demoData;
  "lib/positionEntries": typeof lib_positionEntries;
  llmActions: typeof llmActions;
  llmCosts: typeof llmCosts;
  orderApprovals: typeof orderApprovals;
  overnight: typeof overnight;
  "policy/engine": typeof policy_engine;
  portfolio: typeof portfolio;
  positionHistory: typeof positionHistory;
  positions: typeof positions;
  "providers/alpaca": typeof providers_alpaca;
  "providers/llm": typeof providers_llm;
  "providers/technicals": typeof providers_technicals;
  rawEvents: typeof rawEvents;
  riskState: typeof riskState;
  scraper: typeof scraper;
  secEdgar: typeof secEdgar;
  signals: typeof signals;
  signalsQueries: typeof signalsQueries;
  staleness: typeof staleness;
  status: typeof status;
  technicals: typeof technicals;
  trades: typeof trades;
  tradingActions: typeof tradingActions;
  tradingAgent: typeof tradingAgent;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
