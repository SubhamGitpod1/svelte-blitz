import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';
import tsconfigPaths from 'vite-tsconfig-paths'
import _glob from 'glob';
import path from 'path'
import {transformBlitzRpcResolverClient} from './@blitzjs/rpc/dist/loader-client.cjs'
import { transformBlitzRpcServer, collectResolvers } from './@blitzjs/rpc/dist/loader-server.cjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
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
				"process.env": process.env
			},
			server: {
				fs: {
					allow: ["."]
				}
			},
			plugins: [
				polyfillNode(),
				tsconfigPaths({
					root: ".",
					extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte", ".html"]
				}),
				{
					resolveId(id) {
						const posibleImports = glob(`./${id}?(${consideredExtensions.join("|")})`)
						if(posibleImports.length === 0) return
						return path.resolve(
							posibleImports.find(Import => Import.endsWith(".svelte")) 
							?? posibleImports.find(Import => Import.endsWith(".ts"))
							?? posibleImports.find(Import => Import.endsWith(".tsx"))
							?? posibleImports.find(Import => Import.endsWith("js"))
							?? posibleImports.find(Import => Import.endsWith("jsx"))
							?? posibleImports[0]
						)
					},
					name: "typescript:import-from-base"
				},
				{
					async load(id, options) {
						if(options?.ssr || !/[\\/](queries|mutations)[\\/]/.test(id)) return
						return await transformBlitzRpcResolverClient("", id, process.cwd())
					},
					name: "blitz:client-loader"
				},
				{
					async transform(code, id, options) {
						if(!options?.ssr || !id.includes("[...blitz].js")) return
						const resolvers = await collectResolvers(process.cwd(), ["ts", "js"])
						return await transformBlitzRpcServer(code, id, process.cwd(), resolvers)
					},
					name: "blitz:server-loader"
				},
			]
		}
	}
};

export default config;
