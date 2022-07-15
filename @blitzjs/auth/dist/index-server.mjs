import { C as COOKIE_ANONYMOUS_SESSION_TOKEN, j as COOKIE_SESSION_TOKEN, k as COOKIE_REFRESH_TOKEN, n as HEADER_CSRF, i as SESSION_TOKEN_VERSION_0, T as TOKEN_SEPARATOR, H as HANDLE_SEPARATOR, S as SESSION_TYPE_OPAQUE_TOKEN_SIMPLE, h as SESSION_TYPE_ANONYMOUS_JWT, l as COOKIE_CSRF_TOKEN, o as HEADER_PUBLIC_DATA_TOKEN, m as COOKIE_PUBLIC_DATA_TOKEN, r as HEADER_CSRF_ERROR, q as HEADER_SESSION_CREATED } from './chunks/index.js';
export { A as AuthClientPlugin, C as COOKIE_ANONYMOUS_SESSION_TOKEN, l as COOKIE_CSRF_TOKEN, m as COOKIE_PUBLIC_DATA_TOKEN, k as COOKIE_REFRESH_TOKEN, j as COOKIE_SESSION_TOKEN, H as HANDLE_SEPARATOR, n as HEADER_CSRF, r as HEADER_CSRF_ERROR, o as HEADER_PUBLIC_DATA_TOKEN, q as HEADER_SESSION_CREATED, s as LOCALSTORAGE_CSRF_TOKEN, L as LOCALSTORAGE_PREFIX, t as LOCALSTORAGE_PUBLIC_DATA_TOKEN, i as SESSION_TOKEN_VERSION_0, h as SESSION_TYPE_ANONYMOUS_JWT, S as SESSION_TYPE_OPAQUE_TOKEN_SIMPLE, T as TOKEN_SEPARATOR, a as getAntiCSRFToken, f as getAuthValues, g as getPublicDataStore, p as parsePublicDataToken, d as useAuthenticatedSession, c as useAuthorize, b as useAuthorizeIf, e as useRedirectAuthenticated, u as useSession } from './chunks/index.js';
import { toBase64, fromBase64 } from 'b64-lite';
import cookie, { parse } from 'cookie';
import { erify } from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError, isPast, CSRFTokenMismatchError, differenceInMinutes, assert, addYears, addMinutes, connectMiddleware, handleRequestWithMiddleware, secureProxyMiddleware } from 'blitz';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';
import SecurePasswordLib from 'secure-password';
import cookieSession from 'cookie-session';
import 'bad-behavior';
import 'react';
import 'debug';

const hash256 = (input = "") => {
  return crypto.createHash("sha256").update(input).digest("hex");
};
const generateToken = (numberOfCharacters = 32) => nanoid(numberOfCharacters);
const SP = () => new SecurePasswordLib();
const SecurePassword = {
  ...SecurePasswordLib,
  async hash(password) {
    if (!password) {
      throw new AuthenticationError();
    }
    const hashedBuffer = await SP().hash(Buffer.from(password));
    return hashedBuffer.toString("base64");
  },
  async verify(hashedPassword, password) {
    if (!hashedPassword || !password) {
      throw new AuthenticationError();
    }
    try {
      const result = await SP().verify(Buffer.from(password), Buffer.from(hashedPassword, "base64"));
      switch (result) {
        case SecurePassword.VALID:
        case SecurePassword.VALID_NEEDS_REHASH:
          return result;
        default:
          throw new AuthenticationError();
      }
    } catch (error) {
      throw new AuthenticationError();
    }
  }
};

function isLocalhost(req) {
  let { host } = req.headers;
  let localhost = false;
  if (host) {
    host = host.split(":")[0];
    localhost = host === "localhost";
  }
  return localhost;
}
function getCookieParser(headers) {
  return function parseCookie() {
    const header = headers.cookie;
    if (!header) {
      return {};
    }
    return parse(Array.isArray(header) ? header.join(";") : header);
  };
}
const debug = require("debug")("blitz:session");
const simpleRolesIsAuthorized = ({ ctx, args }) => {
  const [roleOrRoles] = args;
  const publicData = ctx.session.$publicData;
  if ("role" in publicData && "roles" in publicData) {
    throw new Error("Session publicData can only have only `role` or `roles`, but not both.'");
  }
  let roles = [];
  if ("role" in publicData) {
    if (typeof publicData.role !== "string") {
      throw new Error("Session publicData.role field must be a string");
    }
    roles.push(publicData.role);
  } else if ("roles" in publicData) {
    if (!Array.isArray(publicData.roles)) {
      throw new Error("Session `publicData.roles` is not an array, but it must be");
    }
    roles = publicData.roles;
  } else {
    throw new Error("Session publicData is missing the required `role` or roles` field");
  }
  if (!roleOrRoles)
    return true;
  const rolesToAuthorize = [];
  if (Array.isArray(roleOrRoles)) {
    rolesToAuthorize.push(...roleOrRoles);
  } else if (roleOrRoles) {
    rolesToAuthorize.push(roleOrRoles);
  }
  for (const role of rolesToAuthorize) {
    if (roles.includes(role))
      return true;
  }
  return false;
};
function ensureApiRequest(req) {
  if (!("cookies" in req)) {
    req.cookies = getCookieParser(req.headers)();
  }
}
function ensureMiddlewareResponse(res) {
  if (!("blitzCtx" in res)) {
    res.blitzCtx = {};
  }
}
async function getSession(req, res) {
  ensureApiRequest(req);
  ensureMiddlewareResponse(res);
  debug("cookiePrefix", globalThis.__BLITZ_SESSION_COOKIE_PREFIX);
  if (res.blitzCtx.session) {
    return res.blitzCtx.session;
  }
  let sessionKernel = await getSessionKernel(req, res);
  if (sessionKernel) {
    debug("Got existing session", sessionKernel);
  }
  if (!sessionKernel) {
    debug("No session found, creating anonymous session");
    sessionKernel = await createAnonymousSession(req, res);
  }
  const sessionContext = makeProxyToPublicData(new SessionContextClass(req, res, sessionKernel));
  res.blitzCtx.session = sessionContext;
  return sessionContext;
}
const makeProxyToPublicData = (ctxClass) => {
  return new Proxy(ctxClass, {
    get(target, prop, receiver) {
      if (prop in target || prop === "then") {
        return Reflect.get(target, prop, receiver);
      } else {
        return Reflect.get(target.$publicData, prop, receiver);
      }
    }
  });
};
class SessionContextClass {
  constructor(req, res, kernel) {
    this._req = req;
    this._res = res;
    this._kernel = kernel;
  }
  get $handle() {
    return this._kernel.handle;
  }
  get userId() {
    return this._kernel.publicData.userId;
  }
  get $publicData() {
    return this._kernel.publicData;
  }
  $authorize(...args) {
    const e = new AuthenticationError();
    Error.captureStackTrace(e, this.$authorize);
    if (!this.userId)
      throw e;
    if (!this.$isAuthorized(...args)) {
      const err = new AuthorizationError();
      Error.captureStackTrace(err, this.$authorize);
      throw err;
    }
  }
  $isAuthorized(...args) {
    if (!this.userId)
      return false;
    return global.sessionConfig.isAuthorized({ ctx: this._res.blitzCtx, args });
  }
  $thisIsAuthorized(...args) {
    return this.$isAuthorized(...args);
  }
  async $create(publicData, privateData) {
    this._kernel = await createNewSession({
      req: this._req,
      res: this._res,
      publicData,
      privateData,
      jwtPayload: this._kernel.jwtPayload,
      anonymous: false
    });
  }
  async $revoke() {
    this._kernel = await revokeSession(this._req, this._res, this.$handle);
  }
  async $revokeAll() {
    await this.$revoke();
    await revokeAllSessionsForUser(this.$publicData.userId);
    return;
  }
  async $setPublicData(data) {
    if (this.userId) {
      await syncPubicDataFieldsForUserIfNeeded(this.userId, data);
    }
    this._kernel.publicData = await setPublicData(this._req, this._res, this._kernel, data);
  }
  async $getPrivateData() {
    return await getPrivateData(this.$handle) || {};
  }
  $setPrivateData(data) {
    return setPrivateData(this._kernel, data);
  }
}
const TOKEN_LENGTH = 32;
const generateEssentialSessionHandle = () => {
  return generateToken(TOKEN_LENGTH) + HANDLE_SEPARATOR + SESSION_TYPE_OPAQUE_TOKEN_SIMPLE;
};
const generateAnonymousSessionHandle = () => {
  return generateToken(TOKEN_LENGTH) + HANDLE_SEPARATOR + SESSION_TYPE_ANONYMOUS_JWT;
};
const createSessionToken = (handle, publicData) => {
  let publicDataString;
  if (typeof publicData === "string") {
    publicDataString = publicData;
  } else {
    publicDataString = JSON.stringify(publicData);
  }
  return toBase64([handle, generateToken(TOKEN_LENGTH), hash256(publicDataString), SESSION_TOKEN_VERSION_0].join(TOKEN_SEPARATOR));
};
const parseSessionToken = (token) => {
  const [handle, id, hashedPublicData, version] = fromBase64(token).split(TOKEN_SEPARATOR);
  if (!handle || !id || !hashedPublicData || !version) {
    throw new AuthenticationError("Failed to parse session token");
  }
  return {
    handle,
    id,
    hashedPublicData,
    version
  };
};
const createPublicDataToken = (publicData) => {
  const payload = typeof publicData === "string" ? publicData : JSON.stringify(publicData);
  return toBase64(payload);
};
const createAntiCSRFToken = () => generateToken(TOKEN_LENGTH);
const getSessionSecretKey = () => {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.SESSION_SECRET_KEY && process.env.SECRET_SESSION_KEY) {
      throw new Error("You need to rename the SECRET_SESSION_KEY environment variable to SESSION_SECRET_KEY (but don't feel bad, we've all done it :)");
    }
    assert(process.env.SESSION_SECRET_KEY, "You must provide the SESSION_SECRET_KEY environment variable in production. This is used to sign and verify tokens. It should be 32 chars long.");
    assert(process.env.SESSION_SECRET_KEY.length >= 32, "The SESSION_SECRET_KEY environment variable must be at least 32 bytes for sufficent token security");
    return process.env.SESSION_SECRET_KEY;
  } else {
    return process.env.SESSION_SECRET_KEY || "default-dev-secret";
  }
};
const JWT_NAMESPACE = "blitzjs";
const JWT_ISSUER = "blitzjs";
const JWT_AUDIENCE = "blitzjs";
const JWT_ANONYMOUS_SUBJECT = "anonymous";
const JWT_ALGORITHM = "HS256";
const createAnonymousSessionToken = (payload) => {
  return sign({ [JWT_NAMESPACE]: payload }, getSessionSecretKey() || "", {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: JWT_ANONYMOUS_SUBJECT
  });
};
const parseAnonymousSessionToken = (token) => {
  const secret = getSessionSecretKey();
  try {
    const fullPayload = verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: JWT_ANONYMOUS_SUBJECT
    });
    if (typeof fullPayload === "object") {
      return fullPayload[JWT_NAMESPACE];
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};
const setCookie = (res, cookieStr) => {
  const getCookieName = (c) => c.split("=", 2)[0];
  const appendCookie = () => append(res, "Set-Cookie", cookieStr);
  const cookiesHeader = res.getHeader("Set-Cookie");
  const cookieName = getCookieName(cookieStr);
  if (typeof cookiesHeader !== "string" && !Array.isArray(cookiesHeader)) {
    appendCookie();
    return;
  }
  if (typeof cookiesHeader === "string") {
    if (cookieName === getCookieName(cookiesHeader)) {
      res.setHeader("Set-Cookie", cookieStr);
    } else {
      appendCookie();
    }
  } else {
    for (let i = 0; i < cookiesHeader.length; i++) {
      if (cookieName === getCookieName(cookiesHeader[i] || "")) {
        cookiesHeader[i] = cookieStr;
        res.setHeader("Set-Cookie", cookieStr);
        return;
      }
    }
    appendCookie();
  }
};
const setHeader = (res, name, value) => {
  res.setHeader(name, value);
  if ("_blitz" in res) {
    res._blitz[name] = value;
  }
};
const setSessionCookie = (req, res, sessionToken, expiresAt) => {
  setCookie(res, cookie.serialize(COOKIE_SESSION_TOKEN(), sessionToken, {
    path: "/",
    httpOnly: true,
    secure: global.sessionConfig.secureCookies && !isLocalhost(req),
    sameSite: global.sessionConfig.sameSite,
    domain: global.sessionConfig.domain,
    expires: expiresAt
  }));
};
const setAnonymousSessionCookie = (req, res, token, expiresAt) => {
  setCookie(res, cookie.serialize(COOKIE_ANONYMOUS_SESSION_TOKEN(), token, {
    path: "/",
    httpOnly: true,
    secure: global.sessionConfig.secureCookies && !isLocalhost(req),
    sameSite: global.sessionConfig.sameSite,
    domain: global.sessionConfig.domain,
    expires: expiresAt
  }));
};
const setCSRFCookie = (req, res, antiCSRFToken, expiresAt) => {
  debug("setCSRFCookie", antiCSRFToken);
  assert(antiCSRFToken !== void 0, "Internal error: antiCSRFToken is being set to undefined");
  setCookie(res, cookie.serialize(COOKIE_CSRF_TOKEN(), antiCSRFToken, {
    path: "/",
    secure: global.sessionConfig.secureCookies && !isLocalhost(req),
    sameSite: global.sessionConfig.sameSite,
    domain: global.sessionConfig.domain,
    expires: expiresAt
  }));
};
const setPublicDataCookie = (req, res, publicDataToken, expiresAt) => {
  setHeader(res, HEADER_PUBLIC_DATA_TOKEN, "updated");
  setCookie(res, cookie.serialize(COOKIE_PUBLIC_DATA_TOKEN(), publicDataToken, {
    path: "/",
    secure: global.sessionConfig.secureCookies && !isLocalhost(req),
    sameSite: global.sessionConfig.sameSite,
    domain: global.sessionConfig.domain,
    expires: expiresAt
  }));
};
async function getSessionKernel(req, res) {
  const anonymousSessionToken = req.cookies[COOKIE_ANONYMOUS_SESSION_TOKEN()];
  const sessionToken = req.cookies[COOKIE_SESSION_TOKEN()];
  const idRefreshToken = req.cookies[COOKIE_REFRESH_TOKEN()];
  const enableCsrfProtection = req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD" && !process.env.DANGEROUSLY_DISABLE_CSRF_PROTECTION;
  const antiCSRFToken = req.headers[HEADER_CSRF];
  if (sessionToken) {
    debug("[getSessionKernel] Request has sessionToken");
    const { handle, version, hashedPublicData } = parseSessionToken(sessionToken);
    if (!handle) {
      debug("No handle in sessionToken");
      return null;
    }
    if (version !== SESSION_TOKEN_VERSION_0) {
      console.log(new AuthenticationError("Session token version is not " + SESSION_TOKEN_VERSION_0));
      return null;
    }
    debug("(global as any) session config", global.sessionConfig);
    const persistedSession = await global.sessionConfig.getSession(handle);
    if (!persistedSession) {
      debug("Session not found in DB");
      return null;
    }
    if (!persistedSession.antiCSRFToken) {
      throw new Error("Internal error: persistedSession.antiCSRFToken is empty");
    }
    if (persistedSession.hashedSessionToken !== hash256(sessionToken)) {
      debug("sessionToken hash did not match");
      debug("persisted: ", persistedSession.hashedSessionToken);
      debug("in req: ", hash256(sessionToken));
      return null;
    }
    if (persistedSession.expiresAt && isPast(persistedSession.expiresAt)) {
      debug("Session expired");
      return null;
    }
    if (enableCsrfProtection && persistedSession.antiCSRFToken !== antiCSRFToken) {
      if (!antiCSRFToken) {
        baseLogger({ displayDateTime: false }).warn(`This request is missing the ${HEADER_CSRF} header. You can learn about adding this here: https://blitzjs.com/docs/session-management#manual-api-requests`);
      }
      setHeader(res, HEADER_CSRF_ERROR, "true");
      throw new CSRFTokenMismatchError();
    }
    if (req.method !== "GET") {
      const hasPublicDataChanged = hash256(persistedSession.publicData ?? void 0) !== hashedPublicData;
      if (hasPublicDataChanged) {
        debug("PublicData has changed since the last request");
      }
      const hasQuarterExpiryTimePassed = persistedSession.expiresAt && differenceInMinutes(persistedSession.expiresAt, new Date()) < 0.75 * global.sessionConfig.sessionExpiryMinutes;
      if (hasQuarterExpiryTimePassed) {
        debug("quarter expiry time has passed");
        debug("Persisted expire time", persistedSession.expiresAt);
      }
      if (hasPublicDataChanged || hasQuarterExpiryTimePassed) {
        await refreshSession(req, res, {
          handle,
          publicData: JSON.parse(persistedSession.publicData || ""),
          jwtPayload: null,
          antiCSRFToken: persistedSession.antiCSRFToken,
          sessionToken
        }, { publicDataChanged: hasPublicDataChanged });
      }
    }
    return {
      handle,
      publicData: JSON.parse(persistedSession.publicData || ""),
      jwtPayload: null,
      antiCSRFToken: persistedSession.antiCSRFToken,
      sessionToken
    };
  } else if (idRefreshToken) {
    return null;
  } else if (anonymousSessionToken) {
    debug("Request has anonymousSessionToken");
    const payload = parseAnonymousSessionToken(anonymousSessionToken);
    if (!payload) {
      debug("Payload empty");
      return null;
    }
    if (enableCsrfProtection && payload.antiCSRFToken !== antiCSRFToken) {
      if (!antiCSRFToken) {
        baseLogger({ displayDateTime: false }).warn(`This request is missing the ${HEADER_CSRF} header. You can learn about adding this here: https://blitzjs.com/docs/session-management#manual-api-requests`);
      }
      setHeader(res, HEADER_CSRF_ERROR, "true");
      throw new CSRFTokenMismatchError();
    }
    return {
      handle: payload.handle,
      publicData: payload.publicData,
      antiCSRFToken: payload.antiCSRFToken,
      jwtPayload: payload,
      anonymousSessionToken
    };
  }
  return null;
}
async function createNewSession(args) {
  const { req, res } = args;
  assert(args.publicData.userId !== void 0, "You must provide publicData.userId");
  const antiCSRFToken = createAntiCSRFToken();
  if (args.anonymous) {
    debug("Creating new anonymous session");
    const handle = generateAnonymousSessionHandle();
    const payload = {
      isAnonymous: true,
      handle,
      publicData: args.publicData,
      antiCSRFToken
    };
    const anonymousSessionToken = createAnonymousSessionToken(payload);
    const publicDataToken = createPublicDataToken(args.publicData);
    const expiresAt = addYears(new Date(), 30);
    setAnonymousSessionCookie(req, res, anonymousSessionToken, expiresAt);
    setCSRFCookie(req, res, antiCSRFToken, expiresAt);
    setPublicDataCookie(req, res, publicDataToken, expiresAt);
    setSessionCookie(req, res, "", new Date(0));
    setHeader(res, HEADER_SESSION_CREATED, "true");
    return {
      handle,
      publicData: args.publicData,
      jwtPayload: payload,
      antiCSRFToken,
      anonymousSessionToken
    };
  } else if (global.sessionConfig.method === "essential") {
    debug("Creating new session");
    const newPublicData = {
      ...args.jwtPayload?.publicData || {},
      ...args.publicData
    };
    assert(newPublicData.userId, "You must provide a non-empty userId as publicData.userId");
    let existingPrivateData = {};
    if (args.jwtPayload?.isAnonymous) {
      const session = await global.sessionConfig.getSession(args.jwtPayload.handle);
      if (session) {
        if (session.privateData) {
          existingPrivateData = JSON.parse(session.privateData);
        }
        await global.sessionConfig.deleteSession(args.jwtPayload.handle);
      }
    }
    const newPrivateData = {
      ...existingPrivateData,
      ...args.privateData
    };
    const expiresAt = addMinutes(new Date(), global.sessionConfig.sessionExpiryMinutes);
    const handle = generateEssentialSessionHandle();
    const sessionToken = createSessionToken(handle, newPublicData);
    const publicDataToken = createPublicDataToken(newPublicData);
    await global.sessionConfig.createSession({
      expiresAt,
      handle,
      userId: newPublicData.userId,
      hashedSessionToken: hash256(sessionToken),
      antiCSRFToken,
      publicData: JSON.stringify(newPublicData),
      privateData: JSON.stringify(newPrivateData)
    });
    setSessionCookie(req, res, sessionToken, expiresAt);
    setCSRFCookie(req, res, antiCSRFToken, expiresAt);
    setPublicDataCookie(req, res, publicDataToken, expiresAt);
    setAnonymousSessionCookie(req, res, "", new Date(0));
    setHeader(res, HEADER_SESSION_CREATED, "true");
    return {
      handle,
      publicData: newPublicData,
      jwtPayload: null,
      antiCSRFToken,
      sessionToken
    };
  } else if (global.sessionConfig.method === "advanced") {
    throw new Error("The advanced method is not yet supported");
  } else {
    throw new Error(`Session management method ${global.sessionConfig.method} is invalid. Supported methods are "essential" and "advanced"`);
  }
}
async function createAnonymousSession(req, res) {
  return await createNewSession({
    req,
    res,
    publicData: { userId: null },
    anonymous: true
  });
}
async function refreshSession(req, res, sessionKernel, { publicDataChanged }) {
  debug("Refreshing session", sessionKernel);
  if (sessionKernel.jwtPayload?.isAnonymous) {
    const payload = {
      ...sessionKernel.jwtPayload,
      publicData: sessionKernel.publicData
    };
    const anonymousSessionToken = createAnonymousSessionToken(payload);
    const publicDataToken = createPublicDataToken(sessionKernel.publicData);
    const expiresAt = addYears(new Date(), 30);
    setAnonymousSessionCookie(req, res, anonymousSessionToken, expiresAt);
    setPublicDataCookie(req, res, publicDataToken, expiresAt);
    setCSRFCookie(req, res, sessionKernel.antiCSRFToken, expiresAt);
  } else if (global.sessionConfig.method === "essential" && "sessionToken" in sessionKernel) {
    const expiresAt = addMinutes(new Date(), global.sessionConfig.sessionExpiryMinutes);
    const publicDataToken = createPublicDataToken(sessionKernel.publicData);
    let sessionToken;
    if (publicDataChanged) {
      sessionToken = createSessionToken(sessionKernel.handle, sessionKernel.publicData);
    } else {
      sessionToken = sessionKernel.sessionToken;
    }
    setSessionCookie(req, res, sessionToken, expiresAt);
    setPublicDataCookie(req, res, publicDataToken, expiresAt);
    setCSRFCookie(req, res, sessionKernel.antiCSRFToken, expiresAt);
    debug("Updating session in db with", { expiresAt });
    if (publicDataChanged) {
      await global.sessionConfig.updateSession(sessionKernel.handle, {
        expiresAt,
        hashedSessionToken: hash256(sessionToken),
        publicData: JSON.stringify(sessionKernel.publicData)
      });
    } else {
      await global.sessionConfig.updateSession(sessionKernel.handle, {
        expiresAt
      });
    }
  } else if (global.sessionConfig.method === "advanced") {
    throw new Error("refreshSession() not implemented for advanced method");
  }
}
async function getAllSessionHandlesForUser(userId) {
  return (await global.sessionConfig.getSessions(userId)).map((session) => session.handle);
}
async function syncPubicDataFieldsForUserIfNeeded(userId, data) {
  const dataToSync = {};
  global.sessionConfig.publicDataKeysToSyncAcrossSessions?.forEach((key) => {
    if (data[key]) {
      dataToSync[key] = data[key];
    }
  });
  if (Object.keys(dataToSync).length) {
    const sessions = await global.sessionConfig.getSessions(userId);
    for (const session of sessions) {
      const publicData = JSON.stringify({
        ...session.publicData ? JSON.parse(session.publicData) : {},
        ...dataToSync
      });
      await global.sessionConfig.updateSession(session.handle, { publicData });
    }
  }
}
async function revokeSession(req, res, handle, anonymous = false) {
  debug("Revoking session", handle);
  if (!anonymous) {
    try {
      await global.sessionConfig.deleteSession(handle);
    } catch (error) {
    }
  }
  return createAnonymousSession(req, res);
}
async function revokeAllSessionsForUser(userId) {
  let sessionHandles = (await global.sessionConfig.getSessions(userId)).map((session) => session.handle);
  let revoked = [];
  for (const handle of sessionHandles) {
    try {
      await global.sessionConfig.deleteSession(handle);
    } catch (error) {
    }
    revoked.push(handle);
  }
  return revoked;
}
async function getPublicData(sessionKernel) {
  if (sessionKernel.jwtPayload?.publicData) {
    return sessionKernel.jwtPayload?.publicData;
  } else {
    const session = await global.sessionConfig.getSession(sessionKernel.handle);
    if (!session) {
      throw new Error("getPublicData() failed because handle doesn't exist " + sessionKernel.handle);
    }
    if (session.publicData) {
      return JSON.parse(session.publicData);
    } else {
      return {};
    }
  }
}
async function getPrivateData(handle) {
  const session = await global.sessionConfig.getSession(handle);
  if (session && session.privateData) {
    return JSON.parse(session.privateData);
  } else {
    return null;
  }
}
async function setPrivateData(sessionKernel, data) {
  let existingPrivateData = await getPrivateData(sessionKernel.handle);
  if (existingPrivateData === null) {
    try {
      await global.sessionConfig.createSession({
        handle: sessionKernel.handle
      });
    } catch (error) {
    }
    existingPrivateData = {};
  }
  const privateData = JSON.stringify({
    ...existingPrivateData,
    ...data
  });
  await global.sessionConfig.updateSession(sessionKernel.handle, {
    privateData
  });
}
async function setPublicData(req, res, sessionKernel, data) {
  delete data.userId;
  const publicData = {
    ...await getPublicData(sessionKernel),
    ...data
  };
  await refreshSession(req, res, { ...sessionKernel, publicData }, { publicDataChanged: true });
  return publicData;
}
async function setPublicDataForUser(userId, data) {
  delete data.userId;
  const sessions = await global.sessionConfig.getSessions(userId);
  for (const session of sessions) {
    const publicData = JSON.stringify({
      ...JSON.parse(session.publicData || ""),
      ...data
    });
    await global.sessionConfig.updateSession(session.handle, { publicData });
  }
}
function append(res, field, val) {
  let prev = res.getHeader(field);
  let value = val;
  if (prev !== void 0) {
    value = Array.isArray(prev) ? prev.concat(val) : Array.isArray(val) ? [prev].concat(val) : [prev, val];
  }
  value = Array.isArray(value) ? value.map(String) : String(value);
  res.setHeader(field, value);
  return res;
}

const PrismaStorage = (db) => {
  return {
    getSession: (handle) => db.session.findFirst({ where: { handle } }),
    getSessions: (userId) => db.session.findMany({ where: { userId } }),
    createSession: (session) => {
      let user;
      if (session.userId) {
        user = { connect: { id: session.userId } };
      }
      return db.session.create({
        data: { ...session, userId: void 0, user }
      });
    },
    updateSession: async (handle, session) => {
      try {
        return await db.session.update({ where: { handle }, data: session });
      } catch (error) {
        if (error.code === "P2016") {
          console.warn("Could not update session because it's not in the DB");
        } else {
          throw error;
        }
      }
    },
    deleteSession: (handle) => db.session.delete({ where: { handle } })
  };
};
const defaultConfig_ = {
  sessionExpiryMinutes: 30 * 24 * 60,
  method: "essential",
  sameSite: "lax",
  publicDataKeysToSyncAcrossSessions: ["role", "roles"],
  secureCookies: !process.env.DISABLE_SECURE_COOKIES && process.env.NODE_ENV === "production"
};
function AuthServerPlugin(options) {
  globalThis.__BLITZ_SESSION_COOKIE_PREFIX = options.cookiePrefix || "blitz";
  function authPluginSessionMiddleware() {
    assert(options.isAuthorized, "You must provide an authorization implementation to sessionMiddleware as isAuthorized(userRoles, input)");
    global.sessionConfig = {
      ...defaultConfig_,
      ...options.storage,
      ...options
    };
    const cookiePrefix = global.sessionConfig.cookiePrefix ?? "blitz";
    assert(cookiePrefix.match(/^[a-zA-Z0-9-_]+$/), `The cookie prefix used has invalid characters. Only alphanumeric characters, "-"  and "_" character are supported`);
    const blitzSessionMiddleware = async (req, res, next) => {
      console.log("Starting sessionMiddleware...");
      if (!res.blitzCtx?.session) {
        await getSession(req, res);
      }
      return next();
    };
    blitzSessionMiddleware.config = {
      name: "blitzSessionMiddleware",
      cookiePrefix
    };
    return blitzSessionMiddleware;
  }
  return {
    requestMiddlewares: [authPluginSessionMiddleware()]
  };
}

const isFunction = (functionToCheck) => typeof functionToCheck === "function";
const isVerifyCallbackResult = (value) => typeof value === "object" && value !== null && "publicData" in value;
const INTERNAL_REDIRECT_URL_KEY = "_redirectUrl";
function passportAuth(config) {
  return async function authHandler(req, res) {
    const configObject = isFunction(config) ? config({ ctx: res.blitzCtx, req, res }) : config;
    const cookieSessionMiddleware = cookieSession({
      secret: process.env.SESSION_SECRET_KEY || "default-dev-secret",
      secure: process.env.NODE_ENV === "production" && !isLocalhost(req)
    });
    const passportMiddleware = passport.initialize();
    const middleware = [
      connectMiddleware(cookieSessionMiddleware),
      connectMiddleware(passportMiddleware),
      connectMiddleware(passport.session())
    ];
    if (configObject.secureProxy) {
      middleware.push(secureProxyMiddleware);
    }
    assert(req.query.auth, "req.query.auth is not defined. Page must be named [...auth].ts/js. See more at https://blitzjs.com/docs/passportjs#1-add-the-passport-js-api-route");
    assert(Array.isArray(req.query.auth), "req.query.auth must be an array. Page must be named [...auth].ts/js. See more at https://blitzjs.com/docs/passportjs#1-add-the-passport-js-api-route");
    if (!req.query.auth.length) {
      return res.status(404).end();
    }
    assert(configObject.strategies.length, "No Passport strategies found! Please add at least one strategy.");
    const blitzStrategy = configObject.strategies.find(({ strategy: strategy2 }) => strategy2.name === req.query?.auth?.[0]);
    assert(blitzStrategy, `A passport strategy was not found for: ${req.query.auth[0]}`);
    const { strategy, authenticateOptions } = blitzStrategy;
    passport.use(strategy);
    const strategyName = strategy.name;
    if (req.query.auth.length === 1) {
      console.info(`Starting authentication via ${strategyName}...`);
      if (req.query.redirectUrl) {
        middleware.push(async (req2, res2, next) => {
          const session = res2.blitzCtx.session;
          assert(session, "Missing Blitz sessionMiddleware!");
          await session.$setPublicData({
            [INTERNAL_REDIRECT_URL_KEY]: req2.query.redirectUrl
          });
          return next();
        });
      }
      middleware.push(connectMiddleware(passport.authenticate(strategyName, { ...authenticateOptions })));
    } else if (req.query.auth[1] === "callback") {
      console.info(`Processing callback for ${strategyName}...`);
      middleware.push(connectMiddleware((req2, res2, next) => {
        const session = res2.blitzCtx.session;
        assert(session, "Missing Blitz sessionMiddleware!");
        passport.authenticate(strategyName, async (err, result) => {
          try {
            let error = err;
            if (!error && result === false) {
              console.warn(`Login via ${strategyName} failed - usually this means the user did not authenticate properly with the provider`);
              error = `Login failed`;
            }
            const redirectUrlFromVerifyResult = result && typeof result === "object" && result.redirectUrl;
            let redirectUrl = redirectUrlFromVerifyResult || session.$publicData[INTERNAL_REDIRECT_URL_KEY] || (error ? configObject.errorRedirectUrl : configObject.successRedirectUrl) || "/";
            if (error) {
              redirectUrl += "?authError=" + encodeURIComponent(error.toString());
              res2.setHeader("Location", redirectUrl);
              res2.statusCode = 302;
              res2.end();
              return;
            }
            assert(typeof result === "object" && result !== null, `Your '${strategyName}' passport verify callback returned empty data. Ensure you call 'done(null, {publicData: {userId: 1}})' along with any other publicData fields you need)`);
            assert(result.publicData, `'publicData' is missing from your '${strategyName}' passport verify callback. Ensure you call 'done(null, {publicData: {userId: 1}})' along with any other publicData fields you need)`);
            assert(isVerifyCallbackResult(result), "Passport verify callback is invalid");
            delete result.publicData[INTERNAL_REDIRECT_URL_KEY];
            await session.$create(result.publicData, result.privateData);
            res2.setHeader("Location", redirectUrl);
            res2.statusCode = 302;
            res2.end();
          } catch (error) {
            console.error(error);
            res2.statusCode = 500;
            res2.end();
          }
        })(req2, res2, next);
      }));
    }
    await handleRequestWithMiddleware(req, res, middleware);
  };
}

export { AuthServerPlugin, PrismaStorage, SecurePassword, SessionContextClass, generateToken, getAllSessionHandlesForUser, getCookieParser, getSession, hash256, isLocalhost, passportAuth, setPublicDataForUser, simpleRolesIsAuthorized };
