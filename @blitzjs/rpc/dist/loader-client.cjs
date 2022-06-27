'use strict';

const loaderUtils = require('./chunks/loader-utils.cjs');
const path = require('path');
require('blitz');

async function loader(input) {
	const compiler = this._compiler;
	const id = this.resource;
	const root = this._compiler.context;
	const isSSR = compiler.name === 'server';
	if (!isSSR) {
		return await transformBlitzRpcResolverClient(
			input,
			loaderUtils.toPosixPath(id),
			loaderUtils.toPosixPath(root),
			this.query
		);
	}
	return input;
}
module.exports = loader;
async function transformBlitzRpcResolverClient(_src, id, root, options) {
	loaderUtils.assertPosixPath(id);
	loaderUtils.assertPosixPath(root);
	const resolverFilePath = '/' + path.posix.relative(root, id);
	loaderUtils.assertPosixPath(resolverFilePath);
	const routePath = loaderUtils.convertPageFilePathToRoutePath(
		resolverFilePath,
		options?.resolverBasePath
	);
	const resolverName = loaderUtils.convertFilePathToResolverName(resolverFilePath);
	const resolverType = loaderUtils.convertFilePathToResolverType(resolverFilePath);
	const code = `
    // @ts-nocheck
    import { __internal_buildRpcClient } from "${__dirname}/index-browser.mjs";
    export default __internal_buildRpcClient({
      resolverName: "${resolverName}",
      resolverType: "${resolverType}",
      routePath: "${routePath}",
    });
  `;
	return code;
}

module.exports.transformBlitzRpcResolverClient = transformBlitzRpcResolverClient;
