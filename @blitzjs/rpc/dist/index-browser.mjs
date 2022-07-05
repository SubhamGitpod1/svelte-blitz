// @ts-nocheck
import {
	isClient,
	isServer,
	CSRFTokenMismatchError,
	createClientPlugin
} from 'blitz/dist/index-browser.mjs';
import {
	useQuery as useQuery$1,
	useInfiniteQuery as useInfiniteQuery$1,
	useMutation as useMutation$1,
	QueryClient
} from 'react-query';
export { QueryClient, useQueryErrorResetBoundary } from 'react-query';
import {
	getAntiCSRFToken,
	HEADER_CSRF,
	HEADER_PUBLIC_DATA_TOKEN,
	getPublicDataStore,
	HEADER_SESSION_CREATED,
	HEADER_CSRF_ERROR,
	useSession
} from '../../auth/dist/index-browser.mjs';
import { serialize, deserialize } from 'superjson';
import { useRouter } from 'next/router.js';
export { dehydrate } from 'react-query/lib/hydration/index.js';
import { normalizePathTrailingSlash } from 'next/dist/client/normalize-trailing-slash.js';
import { addBasePath } from 'next/dist/shared/lib/router/router.js';

const requestIdleCallback =
	(typeof self !== 'undefined' &&
		self.requestIdleCallback &&
		self.requestIdleCallback.bind(window)) ||
	function (cb) {
		let start = Date.now();
		return setTimeout(function () {
			cb({
				didTimeout: false,
				timeRemaining: function () {
					return Math.max(0, 50 - (Date.now() - start));
				}
			});
		}, 1);
	};
const getQueryClient = () => globalThis.queryClient;
function isRpcClient(f) {
	return !!f._isRpcClient;
}
const getQueryCacheFunctions = (resolver, params) => ({
	setQueryData: (newData, opts = { refetch: true }) => {
		return setQueryData(resolver, params, newData, opts);
	}
});
const emptyQueryFn = (() => {
	const fn = () => new Promise(() => {});
	fn._isRpcClient = true;
	return fn;
})();
const isNotInUserTestEnvironment = () => {
	if (process.env.JEST_WORKER_ID === void 0) return true;
	if (process.env.BLITZ_TEST_ENVIRONMENT !== void 0) return true;
	return false;
};
const validateQueryFn = (queryFn) => {
	if (isClient && !isRpcClient(queryFn) && isNotInUserTestEnvironment()) {
		throw new Error(
			`Either the file path to your resolver is incorrect (must be in a "queries" or "mutations" folder that isn't nested inside "pages" or "api") or you are trying to use Blitz's useQuery to fetch from third-party APIs (to do that, import useQuery directly from "react-query")`
		);
	}
};
const sanitize = (type) => (queryFn) => {
	if (isServer) return queryFn;
	validateQueryFn(queryFn);
	const rpcClient = queryFn;
	const queryFnName = type === 'mutation' ? 'useMutation' : 'useQuery';
	if (rpcClient._resolverType !== type && isNotInUserTestEnvironment()) {
		throw new Error(
			`"${queryFnName}" was expected to be called with a ${type} but was called with a "${rpcClient._resolverType}"`
		);
	}
	return rpcClient;
};
const sanitizeQuery = sanitize('query');
const sanitizeMutation = sanitize('mutation');
const getQueryKeyFromUrlAndParams = (url, params) => {
	const queryKey = [url];
	const args = typeof params === 'function' ? params() : params;
	queryKey.push(serialize(args));
	return queryKey;
};
function getQueryKey(resolver, params) {
	if (typeof resolver === 'undefined') {
		throw new Error('getQueryKey is missing the first argument - it must be a resolver function');
	}
	return getQueryKeyFromUrlAndParams(sanitizeQuery(resolver)._routePath, params);
}
function getInfiniteQueryKey(resolver, params) {
	if (typeof resolver === 'undefined') {
		throw new Error(
			'getInfiniteQueryKey is missing the first argument - it must be a resolver function'
		);
	}
	const queryKey = getQueryKeyFromUrlAndParams(sanitizeQuery(resolver)._routePath, params);
	return [...queryKey, 'infinite'];
}
function invalidateQuery(resolver, params) {
	if (typeof resolver === 'undefined') {
		throw new Error(
			'invalidateQuery is missing the first argument - it must be a resolver function'
		);
	}
	const fullQueryKey = getQueryKey(resolver, params);
	let queryKey;
	if (params) {
		queryKey = fullQueryKey;
	} else {
		queryKey = fullQueryKey[0];
	}
	return getQueryClient().invalidateQueries(queryKey);
}
function setQueryData(resolver, params, newData, opts = { refetch: true }) {
	if (typeof resolver === 'undefined') {
		throw new Error('setQueryData is missing the first argument - it must be a resolver function');
	}
	const queryKey = getQueryKey(resolver, params);
	return new Promise((res) => {
		getQueryClient().setQueryData(queryKey, newData);
		let result;
		if (opts.refetch) {
			result = invalidateQuery(resolver, params);
		}
		if (isClient) {
			requestIdleCallback(() => {
				res(result);
			});
		} else {
			res(result);
		}
	});
}

function normalizeApiRoute(path) {
	return normalizePathTrailingSlash(addBasePath(path));
}
function __internal_buildRpcClient({ resolverName, resolverType, routePath }) {
	const fullRoutePath = normalizeApiRoute('/api/rpc' + routePath);
	const httpClient = async (params, opts = {}) => {
		const debug = (await import('debug')).default('blitz:rpc');
		if (!opts.fromQueryHook && !opts.fromInvoke) {
			console.warn(
				'[Deprecation] Directly calling queries/mutations is deprecated in favor of invoke(queryFn, params)'
			);
		}
		if (isServer) {
			return Promise.resolve();
		}
		debug('Starting request for', fullRoutePath, 'with', params, 'and', opts);
		const headers = {
			'Content-Type': 'application/json'
		};
		const antiCSRFToken = getAntiCSRFToken();
		if (antiCSRFToken) {
			debug('Adding antiCSRFToken cookie header', antiCSRFToken);
			headers[HEADER_CSRF] = antiCSRFToken;
		} else {
			debug('No antiCSRFToken cookie found');
		}
		let serialized;
		if (opts.alreadySerialized) {
			serialized = params;
		} else {
			serialized = serialize(params);
		}
		const controller = new AbortController();
		const promise = window
			.fetch(fullRoutePath, {
				method: 'POST',
				headers,
				credentials: 'include',
				redirect: 'follow',
				body: JSON.stringify({
					params: serialized.json,
					meta: {
						params: serialized.meta
					}
				}),
				signal: controller.signal
			})
			.then(async (response) => {
				debug('Received request for', routePath);
				if (response.headers) {
					if (response.headers.get(HEADER_PUBLIC_DATA_TOKEN)) {
						getPublicDataStore().updateState();
						debug('Public data updated');
					}
					if (response.headers.get(HEADER_SESSION_CREATED)) {
						debug('Session created');
						setTimeout(async () => {
							debug('Invalidating react-query cache...');
							await getQueryClient().cancelQueries();
							await getQueryClient().resetQueries();
							getQueryClient().getMutationCache().clear();
						}, 100);
					}
					if (response.headers.get(HEADER_CSRF_ERROR)) {
						const err = new CSRFTokenMismatchError();
						err.stack = null;
						throw err;
					}
				}
				if (!response.ok) {
					const error = new Error(response.statusText);
					error.statusCode = response.status;
					error.path = routePath;
					error.stack = null;
					throw error;
				} else {
					let payload;
					try {
						payload = await response.json();
					} catch (error) {
						const err = new Error(`Failed to parse json from ${routePath}`);
						err.stack = null;
						throw err;
					}
					if (payload.error) {
						let error = deserialize({
							json: payload.error,
							meta: payload.meta?.error
						});
						if (error.name === 'AuthenticationError' && getPublicDataStore().getData().userId) {
							getPublicDataStore().clear();
						}
						const prismaError = error.message.match(/invalid.*prisma.*invocation/i);
						if (prismaError && !('code' in error)) {
							error = new Error(prismaError[0]);
							error.statusCode = 500;
						}
						error.stack = null;
						throw error;
					} else {
						const data = deserialize({
							json: payload.result,
							meta: payload.meta?.result
						});
						if (!opts.fromQueryHook) {
							const queryKey = getQueryKeyFromUrlAndParams(routePath, params);
							getQueryClient().setQueryData(queryKey, data);
						}
						return data;
					}
				}
			});
		return promise;
	};
	const rpcClient = httpClient;
	rpcClient._isRpcClient = true;
	rpcClient._resolverName = resolverName;
	rpcClient._resolverType = resolverType;
	rpcClient._routePath = fullRoutePath;
	return rpcClient;
}

function useQuery(queryFn, params, options = {}) {
	if (typeof queryFn === 'undefined') {
		throw new Error('useQuery is missing the first argument - it must be a query function');
	}
	const suspenseEnabled = Boolean(globalThis.__BLITZ_SUSPENSE_ENABLED);
	let enabled = isServer && suspenseEnabled ? false : options?.enabled ?? options?.enabled !== null;
	const suspense = enabled === false ? false : options?.suspense;
	const session = useSession({ suspense });
	if (session.isLoading) {
		enabled = false;
	}
	const routerIsReady = useRouter().isReady || (isServer && suspenseEnabled);
	const enhancedResolverRpcClient = sanitizeQuery(queryFn);
	const queryKey = getQueryKey(queryFn, params);
	const { data, ...queryRest } = useQuery$1({
		queryKey: routerIsReady ? queryKey : ['_routerNotReady_'],
		queryFn: routerIsReady
			? () => enhancedResolverRpcClient(params, { fromQueryHook: true })
			: emptyQueryFn,
		...options,
		enabled
	});
	if (
		queryRest.isIdle &&
		isServer &&
		suspenseEnabled !== false &&
		!data &&
		(!options || !('suspense' in options) || options.suspense) &&
		(!options || !('enabled' in options) || options.enabled)
	) {
		const e = new Error();
		e.name = 'Rendering Suspense fallback...';
		delete e.stack;
		throw e;
	}
	const rest = {
		...queryRest,
		...getQueryCacheFunctions(queryFn, params)
	};
	return [data, rest];
}
function usePaginatedQuery(queryFn, params, options = {}) {
	if (typeof queryFn === 'undefined') {
		throw new Error(
			'usePaginatedQuery is missing the first argument - it must be a query function'
		);
	}
	const suspenseEnabled = Boolean(globalThis.__BLITZ_SUSPENSE_ENABLED);
	let enabled = isServer && suspenseEnabled ? false : options?.enabled ?? options?.enabled !== null;
	const suspense = enabled === false ? false : options?.suspense;
	const session = useSession({ suspense });
	if (session.isLoading) {
		enabled = false;
	}
	const routerIsReady = useRouter().isReady || (isServer && suspenseEnabled);
	const enhancedResolverRpcClient = sanitizeQuery(queryFn);
	const queryKey = getQueryKey(queryFn, params);
	const { data, ...queryRest } = useQuery$1({
		queryKey: routerIsReady ? queryKey : ['_routerNotReady_'],
		queryFn: routerIsReady
			? () => enhancedResolverRpcClient(params, { fromQueryHook: true })
			: emptyQueryFn,
		...options,
		keepPreviousData: true,
		enabled
	});
	if (
		queryRest.isIdle &&
		isServer &&
		suspenseEnabled !== false &&
		!data &&
		(!options || !('suspense' in options) || options.suspense) &&
		(!options || !('enabled' in options) || options.enabled)
	) {
		const e = new Error();
		e.name = 'Rendering Suspense fallback...';
		delete e.stack;
		throw e;
	}
	const rest = {
		...queryRest,
		...getQueryCacheFunctions(queryFn, params)
	};
	return [data, rest];
}
function useInfiniteQuery(queryFn, getQueryParams, options) {
	if (typeof queryFn === 'undefined') {
		throw new Error('useInfiniteQuery is missing the first argument - it must be a query function');
	}
	const suspenseEnabled = Boolean(globalThis.__BLITZ_SUSPENSE_ENABLED);
	let enabled = isServer && suspenseEnabled ? false : options?.enabled ?? options?.enabled !== null;
	const suspense = enabled === false ? false : options?.suspense;
	const session = useSession({ suspense });
	if (session.isLoading) {
		enabled = false;
	}
	const routerIsReady = useRouter().isReady || (isServer && suspenseEnabled);
	const enhancedResolverRpcClient = sanitizeQuery(queryFn);
	const queryKey = getInfiniteQueryKey(queryFn, getQueryParams);
	const { data, ...queryRest } = useInfiniteQuery$1({
		queryKey: routerIsReady ? queryKey : ['_routerNotReady_'],
		queryFn: routerIsReady
			? ({ pageParam }) =>
					enhancedResolverRpcClient(getQueryParams(pageParam), {
						fromQueryHook: true
					})
			: emptyQueryFn,
		...options,
		enabled
	});
	if (
		queryRest.isIdle &&
		isServer &&
		suspenseEnabled !== false &&
		!data &&
		(!options || !('suspense' in options) || options.suspense) &&
		(!options || !('enabled' in options) || options.enabled)
	) {
		const e = new Error();
		e.name = 'Rendering Suspense fallback...';
		delete e.stack;
		throw e;
	}
	const rest = {
		...queryRest,
		...getQueryCacheFunctions(queryFn, getQueryParams),
		pageParams: data?.pageParams
	};
	return [data?.pages, rest];
}
function useMutation(mutationResolver, config) {
	const enhancedResolverRpcClient = sanitizeMutation(mutationResolver);
	const { mutate, mutateAsync, ...rest } = useMutation$1(
		(variables) => enhancedResolverRpcClient(variables, { fromQueryHook: true }),
		{
			throwOnError: true,
			...config
		}
	);
	return [mutateAsync, rest];
}

function invoke(queryFn, params) {
	if (typeof queryFn === 'undefined') {
		throw new Error(
			'invoke is missing the first argument - it must be a query or mutation function'
		);
	}
	if (isClient) {
		const fn = queryFn;
		return fn(params, { fromInvoke: true });
	} else {
		const fn = queryFn;
		return fn(params);
	}
}

function invokeWithCtx(queryFn, params, ctx) {
	if (typeof queryFn === 'undefined') {
		throw new Error(
			'invokeWithCtx is missing the first argument - it must be a query or mutation function'
		);
	}
	return queryFn(params, ctx);
}

const BlitzRpcPlugin = createClientPlugin((options) => {
	const initializeQueryClient = () => {
		const { reactQueryOptions } = options || {};
		let suspenseEnabled = reactQueryOptions?.queries?.suspense ?? true;
		if (!process.env.CLI_COMMAND_CONSOLE && !process.env.CLI_COMMAND_DB) {
			globalThis.__BLITZ_SUSPENSE_ENABLED = suspenseEnabled;
		}
		return new QueryClient({
			defaultOptions: {
				...reactQueryOptions,
				queries: {
					...(typeof window === 'undefined' && { cacheTime: 0 }),
					retry: (failureCount, error) => {
						if (process.env.NODE_ENV !== 'production') return false;
						if (error.message === 'Network request failed' && failureCount <= 3) return true;
						return false;
					},
					...reactQueryOptions?.queries,
					suspense: suspenseEnabled
				}
			}
		});
	};
	const queryClient = initializeQueryClient();
	globalThis.queryClient = queryClient;
	return {
		events: {},
		middleware: {},
		exports: () => ({
			queryClient
		})
	};
});

export {
	BlitzRpcPlugin,
	__internal_buildRpcClient,
	getInfiniteQueryKey,
	getQueryClient,
	getQueryKey,
	invalidateQuery,
	invoke,
	invokeWithCtx,
	normalizeApiRoute,
	setQueryData,
	useInfiniteQuery,
	useMutation,
	usePaginatedQuery,
	useQuery
};
