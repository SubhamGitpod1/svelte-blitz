import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import fs from "fs/promises"
import tsconfigPaths from 'vite-tsconfig-paths'
import _glob from 'glob';
import path from 'path'
import {transformBlitzRpcResolverClient} from './@blitzjs/rpc/dist/loader-client.cjs'
import { transformBlitzRpcServer, collectResolvers } from './@blitzjs/rpc/dist/loader-server.cjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
const glob = _glob.sync
const consideredExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte", ".json"]
/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter(),

		// Override http methods in the Todo forms
		methodOverride: {
			allowed: ['PATCH', 'DELETE']
		},
		vite: {
			define: {
				"process.env": process.env,
				"globalThis.__BLITZ_SESSION_COOKIE_PREFIX": `"blitz-cookie-prefix"`
			},
			server: {
				fs: {
					allow: ["."]
				}
			},
			plugins: [
				{...polyfillNode(), enforce: "post"},
				
				{
					async load(id, options) {
						if(options?.ssr || !/[\\/](queries|mutations)[\\/]/.test(id)) return
						return await transformBlitzRpcResolverClient("", id, process.cwd())
					},
					name: "blitz:client-loader",
					enforce: "pre"
				},
				{
					async transform(code, id, options) {
						if(!options?.ssr || !(id.includes("[...blitz].js") || id.includes("[...blitz].ts"))) return

						const resolvers = await collectResolvers(process.cwd(), ["ts", "js"])
						return await transformBlitzRpcServer(code, id, process.cwd(), resolvers)
					},
					name: "blitz:server-loader",
					enforce: "pre"
				},
				{
					async resolveId(id, importer, options) {
						if(id.startsWith("./") || id.startsWith("/")) return
						try {
							const posibleImportExtensionGlob = `?(${consideredExtensions.join("|")})`
							const posibleImports = [...glob(`./${id}${posibleImportExtensionGlob}`)]
							if(posibleImports.length === 0) return
							const resolvedImport = path.resolve(
								posibleImports.find(Import => Import.endsWith(".svelte")) 
								?? posibleImports.find(Import => Import.endsWith(".ts"))
								?? posibleImports.find(Import => Import.endsWith(".tsx"))
								?? posibleImports.find(Import => Import.endsWith("js"))
								?? posibleImports.find(Import => Import.endsWith("jsx"))
								?? posibleImports[0]
							)
							try {
								const indexfile = glob(`${resolvedImport}/index?(${consideredExtensions.join("|")})`)[0]
								await fs.stat(path.join(indexfile))
								return indexfile
							} catch {
								return resolvedImport
							}
						} catch {

						}
					},
					name: "typescript:import-from-base",
					enforce: "pre"
				}
			]
		}
	}
};

export default config;
