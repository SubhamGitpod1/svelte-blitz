export {
	A as AuthClientPlugin,
	C as COOKIE_ANONYMOUS_SESSION_TOKEN,
	l as COOKIE_CSRF_TOKEN,
	m as COOKIE_PUBLIC_DATA_TOKEN,
	k as COOKIE_REFRESH_TOKEN,
	j as COOKIE_SESSION_TOKEN,
	H as HANDLE_SEPARATOR,
	n as HEADER_CSRF,
	r as HEADER_CSRF_ERROR,
	o as HEADER_PUBLIC_DATA_TOKEN,
	q as HEADER_SESSION_CREATED,
	s as LOCALSTORAGE_CSRF_TOKEN,
	L as LOCALSTORAGE_PREFIX,
	t as LOCALSTORAGE_PUBLIC_DATA_TOKEN,
	i as SESSION_TOKEN_VERSION_0,
	h as SESSION_TYPE_ANONYMOUS_JWT,
	S as SESSION_TYPE_OPAQUE_TOKEN_SIMPLE,
	T as TOKEN_SEPARATOR,
	a as getAntiCSRFToken,
	f as getAuthValues,
	g as getPublicDataStore,
	p as parsePublicDataToken,
	d as useAuthenticatedSession,
	c as useAuthorize,
	b as useAuthorizeIf,
	e as useRedirectAuthenticated,
	u as useSession
} from './chunks/index.mjs';
import 'b64-lite';
import 'bad-behavior';
import 'react';
// import 'blitz/dist/index-browser.cjs';
import 'debug';
