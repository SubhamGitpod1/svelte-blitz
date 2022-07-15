import fs from 'fs/promises';
import _glob from 'glob';
import path from 'path';
// @ts-ignore
import { transformBlitzRpcResolverClient } from '../rpc/dist/loader-client.cjs';
// @ts-ignore
import { transformBlitzRpcServer, collectResolvers } from '../rpc/dist/loader-server.cjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
import resolve from "resolve"
import viteTsPathWithMultyIndex from "../../vite-ts-path-with-multy-index-support/lib/plugin/plugin.js"
// import type {Config} from "@sveltejs/kit"
// import type {UserConfig} from "vite"
// import type { MaybePromise } from '@sveltejs/kit/types/private';

/**
 * @template T
 * @typedef {import("@sveltejs/kit/types/private").MaybePromise<T>} MaybePromise<T> 
 */
/**
 * @typedef {import("vite").UserConfig} UserConfig
 * @typedef {import("@sveltejs/kit").Config} Config
 */
/**
 * 
 * @param {Array<string>} posibleImports 
 * @param {Array<string>} consideredExtensions 
 * @returns string
 */
function selectImportFromPosibleImports(posibleImports, consideredExtensions) {
	for(const extension of consideredExtensions) {
		const selectedImport = posibleImports.find(Import => Import.endsWith(extension))
		if(selectedImport != null) return selectedImport
	}
	return posibleImports[0]
}
const glob = _glob.sync;
const getViteValue= {
    /**
     * 
     * @param {UserConfig} config 
     * @returns {Promise<UserConfig>}
     */
    object: async function(config) {
        return config
    },
    /**
     * 
     * @param {() => MaybePromise<UserConfig>} config 
     * @returns {Promise<UserConfig>}
     */
    "function": async function(config) {
        return await config()
    }
}

/**
 * 
 * @param {(Config & {consideredExtensions?: Array<string>})} config 
 * @returns 
 */
export function createConfig(config) {
    const consideredExtensions = config.consideredExtensions ?? [
        '.ts', 
        '.tsx', 
        '.js', 
        '.jsx', 
        '.mjs', 
        '.cjs', 
        '.svelte', 
        '.json',
        '.png',
        '.jpeg',
        '.ico',
        '.svg',
    ]
    return {
        ...config,
        kit: {
            ...config.kit,
            /**
             * 
             * @returns {Promise<UserConfig>}
             */
            vite: async () => {
                // @ts-ignore
                const viteConfig = config.kit?.vite == null ? {} : await getViteValue[typeof config.kit?.vite](config.kit?.vite)
                return {
                    define: {
                        ...viteConfig.define,
                        // 'process.env': JSON.stringify(process.env)
                    },
                    server: {
                        ...viteConfig.server,
                        fs: {
                            ...viteConfig.server?.fs,
                            allow: [
                                ...(viteConfig.server?.fs?.allow ?? []),
                                '.'
                            ]
                        }
                    },
                    plugins: [
                        ...(viteConfig.plugins ?? []),
                        { ...polyfillNode(), enforce: 'post' },
        
                        {
                            async load(id, options) {
                                if (options?.ssr || !/[\\/](queries|mutations)[\\/]/.test(id)) return;
                                return await transformBlitzRpcResolverClient('', id, process.cwd());
                            },
                            name: 'blitz:client-loader',
                            enforce: 'pre'
                        },
                        {
                            async transform(code, id, options) {
                                if (!options?.ssr || !(id.includes('[...blitz].js') || id.includes('[...blitz].ts')))
                                    return;
                                console.log(options, id)
                                const resolvers = await collectResolvers(process.cwd(), ['ts', 'js']);
                                return await transformBlitzRpcServer(code, id, process.cwd(), resolvers);
                            },
                            name: 'blitz:server-loader',
                            enforce: 'pre'
                        },
                        viteTsPathWithMultyIndex({
                            moduleResolution: "classic",
                            extensions: consideredExtensions
                        })
                        // {
                        //     resolveId(id, importer, options) {
                        //         if(id === "blitz" && !options.ssr) return resolve.sync("blitz/dist/index-browser.mjs")
                        //     },
                        //     enforce: "pre",
                        //     name: "blitz:let-blitz-load-on-frontend"
                        // },
                        // {
                        //     async resolveId(id) {
                        //         if (id.startsWith('./') || id.startsWith('/')) return;
                        //         try {
                        //             const posibleImportExtensionGlob = `?(${consideredExtensions.join('|')})`;
                        //             const posibleImports = [...glob(`./${id}${posibleImportExtensionGlob}`)];
                        //             if (posibleImports.length === 0) return;
                        //             const resolvedImport = path.resolve(
                        //                 selectImportFromPosibleImports(posibleImports, consideredExtensions),
                        //             );
                        //             try {
                        //                 const indexfile = glob(
                        //                     `${resolvedImport}/index?(${consideredExtensions.join('|')})`
                        //                 )[0];
                        //                 await fs.stat(path.join(indexfile));
                        //                 return indexfile;
                        //             } catch {
                        //                 return resolvedImport;
                        //             }
                        //         } catch {}
                        //     },
                        //     name: 'typescript:import-from-base',
                        //     enforce: 'pre'
                        // }
                    ]
                }
            }
        }
    }
}