import fs from 'fs-extra';
import _glob from 'glob';
import path from 'path';
// @ts-ignore
import { transformBlitzRpcResolverClient } from '../rpc/dist/loader-client.cjs';
// @ts-ignore
import { transformBlitzRpcServer, collectResolvers } from '../rpc/dist/loader-server.cjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
import resolve from "resolve"
import viteTsPathWithMultyIndex, {resolveRootBareImport} from "../../vite-ts-path-with-multy-index-support/lib/plugin/plugin.js"
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
 * @param {string} code 
 * @param {boolean} ssr 
 * @param {string[]} clientOnlyBools 
 * @param {string[]} serverOnlyBools 
 * @returns 
 */
function removeIfBlocks(code, ssr, clientOnlyBools = ["client"], serverOnlyBools = ["server"]) {
    if(ssr) {
        const codeWithoutComent = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'')
        let newCode = codeWithoutComent
        
        let startIndexes = codeWithoutComent.match(
            new RegExp(
                `if[\\s\\n]*\\([\\s\\n]*(${
                    clientOnlyBools.join("|")
                }|\\![\\s\\n]*(${
                    serverOnlyBools.join("|")
                }))[\\s\\n]*\\)`,
                "g"
            )
        )?.map(
            str => codeWithoutComent.indexOf(str)
        ) ?? []
        if(startIndexes.length < 1) return
        for(let StartIndex of startIndexes) {
            let startIndex = StartIndex
            let startBracketIndex = codeWithoutComent.indexOf("{", startIndex)
            let endBracketIndex = codeWithoutComent.indexOf("}", startIndex)
            while(true) {
                startBracketIndex = codeWithoutComent.indexOf("{", startBracketIndex + 1)
                const newEndBracketIndex = codeWithoutComent.indexOf("}", endBracketIndex + 1)
                if(
                    !(endBracketIndex > startBracketIndex 
                    && startBracketIndex > 0 
                    && newEndBracketIndex > 0)
                ) break
                endBracketIndex = newEndBracketIndex
            }
            newCode = newCode.replace(
                codeWithoutComent.substring(startIndex, endBracketIndex + 1), 
                ''
            )
        }

        return newCode
    }

    const codeWithoutComent = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'')
    let newCode = codeWithoutComent
    let startIndexes = codeWithoutComent.match(
        new RegExp(
            `if[\\s\\n]*\\([\\s\\n]*(${
                serverOnlyBools.join("|")
            }|\\![\\s\\n]*(${
                clientOnlyBools.join("|")
            }))[\\s\\n]*\\)`,
            "g"
        )
    )?.map(
        str => codeWithoutComent.indexOf(str)
    ) ?? []

    if(startIndexes.length < 1) return
    for(let StartIndex of startIndexes) {
        let startIndex = StartIndex
        let startBracketIndex = codeWithoutComent.indexOf("{", startIndex)
        let endBracketIndex = codeWithoutComent.indexOf("}", startIndex)
        while(true) {
            startBracketIndex = codeWithoutComent.indexOf("{", startBracketIndex + 1)
            const newEndBracketIndex = codeWithoutComent.indexOf("}", endBracketIndex + 1)
            if(endBracketIndex < 0) return
            if(
                endBracketIndex < startBracketIndex 
                || startBracketIndex < 0
            ) break
            endBracketIndex = newEndBracketIndex
        }
        newCode = newCode.replace(
            codeWithoutComent.substring(startIndex, endBracketIndex + 1), 
            ''
        )
    }
    return newCode
}

/**
 * 
 * @param {string} code 
 * @param {boolean} ssr 
 * @returns 
 */
function removeServerClientBlock(code, ssr) {
    return removeIfBlocks(code, ssr)
}

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
 * @param {(Config & {
 *  blitz?: {
 *      consideredExtensions?: Array<string>,
 *      serverOnlyModules?: string[],
 *      clientOnlyBools?: string[],
 *      serverOnlyBools?: string[],
 *  }
 * })} config 
 * @returns 
 */
export function createConfig(config) {
    const serverOnlyModules = config.blitz?.serverOnlyModules ?? ["node-mocks-http"]
    const clientOnlyBools = config.blitz?.clientOnlyBools ?? ["client", "isClient"]
    const serverOnlyBools = config.blitz?.serverOnlyBools ?? ["server", "isServer"]
    const consideredExtensions = config.blitz?.consideredExtensions ?? [
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
                                const resolvers = await collectResolvers(process.cwd(), ['ts', 'js']);
                                return await transformBlitzRpcServer(code, id, process.cwd(), resolvers);
                            },
                            name: 'blitz:server-loader',
                            enforce: 'pre'
                        },
                        {
                            enforce: "pre",
                            resolveId(id, importer, options) {
                                if(options?.ssr || !options?.scan) return
                                if(serverOnlyModules?.some(module => module === id)) return `\0${id}`
                            },
                            transform(code, id, options) {
                                const newCode = removeIfBlocks(code, options?.ssr)
                                if(newCode != null) return newCode
                            }
                        },
                        viteTsPathWithMultyIndex({
                            moduleResolution: "classic",
                            extensions: consideredExtensions
                        })
                    ]
                }
            }
        }
    }
}