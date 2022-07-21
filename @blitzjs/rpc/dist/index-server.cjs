'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const blitz = require('blitz');
const superjson = require('superjson');
const chalk = require('chalk');
const path = require('path');
const indexBrowser = require('./index-browser.cjs');
const reactQuery = require('react-query');
const hydration = require('react-query/hydration');
require('@blitzjs/auth');
require('next/router');
require('next/dist/client/normalize-trailing-slash');
require('next/dist/shared/lib/router/router');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e["default"] : e; }

const chalk__default = /*#__PURE__*/_interopDefaultLegacy(chalk);

function isResultWithContext(x) {
  return typeof x === "object" && x !== null && "ctx" in x && x.__blitz === true;
}
function pipe(...args) {
  const functions = args;
  return async function(input, ctx) {
    let lastResult = input;
    for (let fn of functions) {
      lastResult = await fn(lastResult, ctx);
      if (isResultWithContext(lastResult)) {
        ctx = lastResult.ctx;
        lastResult = lastResult.value;
      }
    }
    return lastResult;
  };
}
const authorize = (...args) => {
  return function _innerAuthorize(input, ctx) {
    const session = ctx.session;
    session.$authorize(...args);
    return {
      __blitz: true,
      value: input,
      ctx
    };
  };
};
function zod(schema, parserType = "async") {
  if (parserType === "sync") {
    return (input) => schema.parse(input);
  } else {
    return (input) => schema.parseAsync(input);
  }
}
const resolver = {
  pipe,
  zod,
  authorize
};

function isObject(value) {
  return typeof value === "object" && value !== null;
}
function getGlobalObject(key, defaultValue) {
  blitz.assert(key.startsWith("__internal_blitz"), "unsupported key");
  if (typeof global === "undefined") {
    return defaultValue;
  }
  blitz.assert(isObject(global), "not an object");
  return global[key] = global[key] || defaultValue;
}
const g = getGlobalObject("__internal_blitzRpcResolverFiles", {
  blitzRpcResolverFilesLoaded: null
});
function loadBlitzRpcResolverFilesWithInternalMechanism() {
  return g.blitzRpcResolverFilesLoaded;
}
function __internal_addBlitzRpcResolver(routePath, resolver) {
  g.blitzRpcResolverFilesLoaded = g.blitzRpcResolverFilesLoaded || {};
  g.blitzRpcResolverFilesLoaded[routePath] = resolver;
  return resolver;
}
const dir = __dirname + (() => "")();
const loaderServer = path.resolve(dir, "./loader-server.cjs");
const loaderClient = path.resolve(dir, "./loader-client.cjs");
async function getResolverMap() {
  {
    const resolverFilesLoaded = loadBlitzRpcResolverFilesWithInternalMechanism();
    if (resolverFilesLoaded) {
      return resolverFilesLoaded;
    }
  }
}
function rpcHandler(config) {
  return async function handleRpcRequest(req, res, ctx) {
    const resolverMap = await getResolverMap();
    blitz.assert(resolverMap, "No query or mutation resolvers found");
    blitz.assert(Array.isArray(req.query.blitz), "It seems your Blitz RPC endpoint file is not named [[...blitz]].(jt)s. Please ensure it is");
    const relativeRoutePath = req.query.blitz.join("/");
    const routePath = "/" + relativeRoutePath;
    const loadableResolver = resolverMap[routePath];
    if (!loadableResolver) {
      throw new Error("No resolver for path: " + routePath);
    }
    const resolver = (await loadableResolver()).default;
    if (!resolver) {
      throw new Error("No default export for resolver path: " + routePath);
    }
    const log = blitz.baseLogger().getChildLogger({
      prefix: [relativeRoutePath + "()"]
    });
    const customChalk = new chalk__default.Instance({
      level: log.settings.type === "json" ? 0 : chalk__default.level
    });
    if (req.method === "HEAD") {
      res.status(200).end();
      return;
    } else if (req.method === "POST") {
      if (typeof req.body.params === "undefined") {
        const error = { message: "Request body is missing the `params` key" };
        log.error(error.message);
        res.status(400).json({
          result: null,
          error
        });
        return;
      }
      try {
        const data = superjson.deserialize({
          json: req.body.params,
          meta: req.body.meta?.params
        });
        log.info(customChalk.dim("Starting with input:"), data ? data : JSON.stringify(data));
        const startTime = Date.now();
        const result = await resolver(data, res.blitzCtx);
        const resolverDuration = Date.now() - startTime;
        log.debug(customChalk.dim("Result:"), result ? result : JSON.stringify(result));
        const serializerStartTime = Date.now();
        const serializedResult = superjson.serialize(result);
        const nextSerializerStartTime = Date.now();
        res.blitzResult = result;
        res.json({
          result: serializedResult.json,
          error: null,
          meta: {
            result: serializedResult.meta
          }
        });
        log.debug(customChalk.dim(`Next.js serialization:${blitz.prettyMs(Date.now() - nextSerializerStartTime)}`));
        const serializerDuration = Date.now() - serializerStartTime;
        const duration = Date.now() - startTime;
        log.info(customChalk.dim(`Finished: resolver:${blitz.prettyMs(resolverDuration)} serializer:${blitz.prettyMs(serializerDuration)} total:${blitz.prettyMs(duration)}`));
        blitz.newLine();
        return;
      } catch (error) {
        if (error._clearStack) {
          delete error.stack;
        }
        log.error(error);
        blitz.newLine();
        if (!error.statusCode) {
          error.statusCode = 500;
        }
        const serializedError = superjson.serialize(error);
        res.json({
          result: null,
          error: serializedError.json,
          meta: {
            error: serializedError.meta
          }
        });
        return;
      }
    } else {
      log.warn(`${req.method} method not supported`);
      res.status(404).end();
      return;
    }
  };
}

exports.BlitzRpcPlugin = indexBrowser.BlitzRpcPlugin;
exports.__internal_buildRpcClient = indexBrowser.__internal_buildRpcClient;
exports.getInfiniteQueryKey = indexBrowser.getInfiniteQueryKey;
exports.getQueryClient = indexBrowser.getQueryClient;
exports.getQueryKey = indexBrowser.getQueryKey;
exports.invalidateQuery = indexBrowser.invalidateQuery;
exports.invoke = indexBrowser.invoke;
exports.invokeWithCtx = indexBrowser.invokeWithCtx;
exports.normalizeApiRoute = indexBrowser.normalizeApiRoute;
exports.setQueryData = indexBrowser.setQueryData;
exports.useInfiniteQuery = indexBrowser.useInfiniteQuery;
exports.useMutation = indexBrowser.useMutation;
exports.usePaginatedQuery = indexBrowser.usePaginatedQuery;
exports.useQuery = indexBrowser.useQuery;
exports.QueryClient = reactQuery.QueryClient;
exports.useQueryErrorResetBoundary = reactQuery.useQueryErrorResetBoundary;
exports.dehydrate = hydration.dehydrate;
exports.__internal_addBlitzRpcResolver = __internal_addBlitzRpcResolver;
exports.loadBlitzRpcResolverFilesWithInternalMechanism = loadBlitzRpcResolverFilesWithInternalMechanism;
exports.loaderClient = loaderClient;
exports.loaderServer = loaderServer;
exports.resolver = resolver;
exports.rpcHandler = rpcHandler;
