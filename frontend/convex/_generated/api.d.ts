/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */
  
  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as activities from "../activities.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as delivery from "../delivery.js";
import type * as donors from "../donors.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as requests from "../requests.js";
import type * as responses from "../responses.js";
import type * as users from "../users.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "activities": typeof activities,
"alerts": typeof alerts,
"auth": typeof auth,
"delivery": typeof delivery,
"donors": typeof donors,
"http": typeof http,
"notifications": typeof notifications,
"requests": typeof requests,
"responses": typeof responses,
"users": typeof users,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
  