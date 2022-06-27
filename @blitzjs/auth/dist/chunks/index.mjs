// @ts-nocheck
import { fromBase64 } from 'b64-lite';
import _BadBehavior from 'bad-behavior';
import React, { useState, useEffect } from 'react';
import { assert, readCookie, isServer, isClient, AuthenticationError, RedirectError, createClientPlugin, deleteCookie } from 'blitz/dist/index-browser.mjs';
import _debug from 'debug';
const TOKEN_SEPARATOR = ";";
const HANDLE_SEPARATOR = ":";
const SESSION_TYPE_OPAQUE_TOKEN_SIMPLE = "ots";
const SESSION_TYPE_ANONYMOUS_JWT = "ajwt";
const SESSION_TOKEN_VERSION_0 = "v0";
const prefix = () => {
  if (!globalThis.__BLITZ_SESSION_COOKIE_PREFIX) {
    throw new Error("");
  }
  return globalThis.__BLITZ_SESSION_COOKIE_PREFIX;
};
const COOKIE_ANONYMOUS_SESSION_TOKEN = () => `${prefix()}_sAnonymousSessionToken`;
const COOKIE_SESSION_TOKEN = () => `${prefix()}_sSessionToken`;
const COOKIE_REFRESH_TOKEN = () => `${prefix()}_sIdRefreshToken`;
const COOKIE_CSRF_TOKEN = () => `${prefix()}_sAntiCsrfToken`;
const COOKIE_PUBLIC_DATA_TOKEN = () => `${prefix()}_sPublicDataToken`;
const HEADER_CSRF = "anti-csrf";
const HEADER_PUBLIC_DATA_TOKEN = "public-data-token";
const HEADER_SESSION_CREATED = "session-created";
const HEADER_CSRF_ERROR = "csrf-error";
const LOCALSTORAGE_PREFIX = "_blitz-";
const LOCALSTORAGE_CSRF_TOKEN = () => `${prefix()}_sAntiCsrfToken`;
const LOCALSTORAGE_PUBLIC_DATA_TOKEN = () => `${prefix()}_sPublicDataToken`;

const urlObjectKeys = [
  "auth",
  "hash",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "slashes"
];
function formatWithValidation(url) {
  if (process.env.NODE_ENV === "development") {
    if (url !== null && typeof url === "object") {
      Object.keys(url).forEach((key) => {
        if (urlObjectKeys.indexOf(key) === -1) {
          console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
        }
      });
    }
  }
  return formatUrl(url);
}
function stringifyUrlQueryParam(param) {
  if (typeof param === "string" || typeof param === "number" && !isNaN(param) || typeof param === "boolean") {
    return String(param);
  } else {
    return "";
  }
}
function urlQueryToSearchParams(urlQuery) {
  const result = new URLSearchParams();
  Object.entries(urlQuery).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, stringifyUrlQueryParam(item)));
    } else {
      result.set(key, stringifyUrlQueryParam(value));
    }
  });
  return result;
}
const slashedProtocols = /https?|ftp|gopher|file/;
function formatUrl(urlObj) {
  let { auth, hostname } = urlObj;
  let protocol = urlObj.protocol || "";
  let pathname = urlObj.pathname || "";
  let hash = urlObj.hash || "";
  let query = urlObj.query || "";
  let host = false;
  auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ":") + "@" : "";
  if (urlObj.host) {
    host = auth + urlObj.host;
  } else if (hostname) {
    host = auth + (~hostname.indexOf(":") ? `[${hostname}]` : hostname);
    if (urlObj.port) {
      host += ":" + urlObj.port;
    }
  }
  if (query && typeof query === "object") {
    query = String(urlQueryToSearchParams(query));
  }
  let search = urlObj.search || query && `?${query}` || "";
  if (protocol && protocol.substr(-1) !== ":")
    protocol += ":";
  if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
    host = "//" + (host || "");
    if (pathname && pathname[0] !== "/")
      pathname = "/" + pathname;
  } else if (!host) {
    host = "";
  }
  if (hash && hash[0] !== "#")
    hash = "#" + hash;
  if (search && search[0] !== "?")
    search = "?" + search;
  pathname = pathname.replace(/[?#]/g, encodeURIComponent);
  search = search.replace("#", "%23");
  return `${protocol}${host}${pathname}${search}${hash}`;
}

const BadBehavior = "default" in _BadBehavior ? _BadBehavior.default : _BadBehavior;
const debug = _debug("blitz:auth-client");
const parsePublicDataToken = (token) => {
  assert(token, "[parsePublicDataToken] Failed: token is empty");
  const publicDataStr = fromBase64(token);
  try {
    const publicData = JSON.parse(publicDataStr);
    return {
      publicData
    };
  } catch (error) {
    throw new Error(`[parsePublicDataToken] Failed to parse publicDataStr: ${publicDataStr}`);
  }
};
const emptyPublicData = { userId: null };
class PublicDataStore {
  constructor() {
    this.eventKey = `${LOCALSTORAGE_PREFIX}publicDataUpdated`;
    this.observable = BadBehavior();
    if (typeof window !== "undefined") {
      this.updateState(void 0, { suppressEvent: true });
      window.addEventListener("storage", (event) => {
        if (event.key === this.eventKey) {
          this.updateState(void 0, { suppressEvent: true });
        }
      });
    }
  }
  updateState(value, opts) {
    if (!opts?.suppressEvent) {
      try {
        localStorage.setItem(this.eventKey, Date.now().toString());
      } catch (err) {
        console.error("LocalStorage is not available", err);
      }
    }
    this.observable.next(value ?? this.getData());
  }
  clear() {
    deleteCookie(COOKIE_PUBLIC_DATA_TOKEN());
    localStorage.removeItem(LOCALSTORAGE_PUBLIC_DATA_TOKEN());
    this.updateState(emptyPublicData);
  }
  getData() {
    const publicDataToken = this.getToken();
    if (!publicDataToken) {
      return emptyPublicData;
    }
    const { publicData } = parsePublicDataToken(publicDataToken);
    return publicData;
  }
  getToken() {
    const cookieValue = readCookie(COOKIE_PUBLIC_DATA_TOKEN());
    if (cookieValue) {
      localStorage.setItem(LOCALSTORAGE_PUBLIC_DATA_TOKEN(), cookieValue);
      return cookieValue;
    } else {
      return localStorage.getItem(LOCALSTORAGE_PUBLIC_DATA_TOKEN());
    }
  }
}
const getPublicDataStore = () => {
  if (!window.__publicDataStore) {
    window.__publicDataStore = new PublicDataStore();
  }
  return window.__publicDataStore;
};
const getAntiCSRFToken = () => {
  const cookieValue = readCookie(COOKIE_CSRF_TOKEN());
  if (cookieValue) {
    localStorage.setItem(LOCALSTORAGE_CSRF_TOKEN(), cookieValue);
    return cookieValue;
  } else {
    return localStorage.getItem(LOCALSTORAGE_CSRF_TOKEN());
  }
};
const useSession = (options = {}) => {
  const suspense = options?.suspense ?? Boolean(globalThis.__BLITZ_SUSPENSE_ENABLED);
  let initialState;
  if (options.initialPublicData) {
    initialState = { ...options.initialPublicData, isLoading: false };
  } else if (suspense) {
    if (isServer) {
      const e = new Error();
      e.name = "Rendering Suspense fallback...";
      delete e.stack;
      throw e;
    } else {
      initialState = { ...getPublicDataStore().getData(), isLoading: false };
    }
  } else {
    initialState = { ...emptyPublicData, isLoading: true };
  }
  const [session, setSession] = useState(initialState);
  useEffect(() => {
    setSession({ ...getPublicDataStore().getData(), isLoading: false });
    const subscription = getPublicDataStore().observable.subscribe((data) => setSession({ ...data, isLoading: false }));
    return subscription.unsubscribe;
  }, []);
  return session;
};
const useAuthorizeIf = (condition) => {
  if (isClient && condition && !getPublicDataStore().getData().userId) {
    const error = new AuthenticationError();
    error.stack = null;
    throw error;
  }
};
const useAuthorize = () => {
  useAuthorizeIf(true);
};
const useAuthenticatedSession = (options = {}) => {
  useAuthorize();
  return useSession(options);
};
const useRedirectAuthenticated = (to) => {
  if (isClient && getPublicDataStore().getData().userId) {
    const error = new RedirectError(to);
    error.stack = null;
    throw error;
  }
};
function getAuthValues(Page, props) {
  if (!Page)
    return {};
  let authenticate = "authenticate" in Page && Page.authenticate;
  let redirectAuthenticatedTo = "redirectAuthenticatedTo" in Page && Page.redirectAuthenticatedTo;
  if (authenticate === void 0 && redirectAuthenticatedTo === void 0) {
    const layout = "getLayout" in Page && Page.getLayout?.(/* @__PURE__ */ React.createElement(Page, {
      ...props
    }));
    if (layout) {
      let currentElement = layout;
      while (true) {
        const type = layout.type;
        if (type.authenticate !== void 0 || type.redirectAuthenticatedTo !== void 0) {
          authenticate = type.authenticate;
          redirectAuthenticatedTo = type.redirectAuthenticatedTo;
          break;
        }
        if (currentElement.props?.children) {
          currentElement = currentElement.props?.children;
        } else {
          break;
        }
      }
    }
  }
  return { authenticate, redirectAuthenticatedTo };
}
function withBlitzAuthPlugin(Page) {
  const AuthRoot = (props) => {
    useSession({ suspense: false });
    let { authenticate, redirectAuthenticatedTo } = getAuthValues(Page, props);
    useAuthorizeIf(authenticate === true);
    if (typeof window !== "undefined") {
      const publicData = getPublicDataStore().getData();
      if (publicData.userId) {
        debug("[BlitzAuthInnerRoot] logged in");
        if (typeof redirectAuthenticatedTo === "function") {
          redirectAuthenticatedTo = redirectAuthenticatedTo({
            session: publicData
          });
        }
        if (redirectAuthenticatedTo) {
          const redirectUrl = typeof redirectAuthenticatedTo === "string" ? redirectAuthenticatedTo : formatWithValidation(redirectAuthenticatedTo);
          debug("[BlitzAuthInnerRoot] redirecting to", redirectUrl);
          const error = new RedirectError(redirectUrl);
          error.stack = null;
          throw error;
        }
      } else {
        debug("[BlitzAuthInnerRoot] logged out");
        if (authenticate && typeof authenticate === "object" && authenticate.redirectTo) {
          let { redirectTo } = authenticate;
          if (typeof redirectTo !== "string") {
            redirectTo = formatWithValidation(redirectTo);
          }
          const url = new URL(redirectTo, window.location.href);
          url.searchParams.append("next", window.location.pathname);
          debug("[BlitzAuthInnerRoot] redirecting to", url.toString());
          const error = new RedirectError(url.toString());
          error.stack = null;
          throw error;
        }
      }
    }
    return /* @__PURE__ */ React.createElement(Page, {
      ...props
    });
  };
  for (let [key, value] of Object.entries(Page)) {
    AuthRoot[key] = value;
  }
  if (process.env.NODE_ENV !== "production") {
    AuthRoot.displayName = `BlitzAuthInnerRoot`;
  }
  return AuthRoot;
}
const AuthClientPlugin = createClientPlugin((options) => {
  globalThis.__BLITZ_SESSION_COOKIE_PREFIX = options.cookiePrefix || "blitz";
  return {
    withProvider: withBlitzAuthPlugin,
    events: {},
    middleware: {},
    exports: () => ({
      useSession,
      useAuthorize,
      useAuthorizeIf,
      useRedirectAuthenticated,
      useAuthenticatedSession,
      getAntiCSRFToken
    })
  };
});

export { AuthClientPlugin as A, COOKIE_ANONYMOUS_SESSION_TOKEN as C, HANDLE_SEPARATOR as H, LOCALSTORAGE_PREFIX as L, SESSION_TYPE_OPAQUE_TOKEN_SIMPLE as S, TOKEN_SEPARATOR as T, getAntiCSRFToken as a, useAuthorizeIf as b, useAuthorize as c, useAuthenticatedSession as d, useRedirectAuthenticated as e, getAuthValues as f, getPublicDataStore as g, SESSION_TYPE_ANONYMOUS_JWT as h, SESSION_TOKEN_VERSION_0 as i, COOKIE_SESSION_TOKEN as j, COOKIE_REFRESH_TOKEN as k, COOKIE_CSRF_TOKEN as l, COOKIE_PUBLIC_DATA_TOKEN as m, HEADER_CSRF as n, HEADER_PUBLIC_DATA_TOKEN as o, parsePublicDataToken as p, HEADER_SESSION_CREATED as q, HEADER_CSRF_ERROR as r, LOCALSTORAGE_CSRF_TOKEN as s, LOCALSTORAGE_PUBLIC_DATA_TOKEN as t, useSession as u };
