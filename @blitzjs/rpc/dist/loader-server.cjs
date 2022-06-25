'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const path = require('path');
const fs = require('fs');
const loaderUtils = require('./chunks/loader-utils.cjs');
require('blitz');

async function loader(input) {
  const compiler = this._compiler;
  const id = this.resource;
  const root = this._compiler.context;
  const isSSR = compiler.name === "server";
  if (isSSR) {
    this.cacheable(false);
    const resolvers = await collectResolvers(root, ["ts", "js"]);
    return await transformBlitzRpcServer(input, loaderUtils.toPosixPath(id), loaderUtils.toPosixPath(root), resolvers, this.query);
  }
  return input;
}
module.exports = loader;
async function transformBlitzRpcServer(src, id, root, resolvers, options) {
  loaderUtils.assertPosixPath(id);
  loaderUtils.assertPosixPath(root);
  const blitzImport = 'import { __internal_addBlitzRpcResolver } from "@blitzjs/rpc";';
  let code = blitzImport + src;
  code += "\n\n";
  for (let resolverFilePath of resolvers) {
    const relativeResolverPath = path.posix.relative(path.dirname(id), path.join(root, resolverFilePath));
    const routePath = loaderUtils.convertPageFilePathToRoutePath(resolverFilePath, options?.resolverBasePath);
    code += `__internal_addBlitzRpcResolver('${routePath}', () => import('${relativeResolverPath}'));`;
    code += "\n";
  }
  return code;
}
function collectResolvers(directory, pageExtensions) {
  return recursiveFindResolvers(directory, loaderUtils.buildPageExtensionRegex(pageExtensions));
}
async function recursiveFindResolvers(dir, filter, ignore, arr = [], rootDir = dir) {
  let folders = await fs.promises.readdir(dir);
  if (dir === rootDir) {
    folders = folders.filter((folder) => loaderUtils.topLevelFoldersThatMayContainResolvers.includes(folder));
  }
  await Promise.all(folders.map(async (part) => {
    const absolutePath = path.join(dir, part);
    if (ignore && ignore.test(part))
      return;
    const pathStat = await fs.promises.stat(absolutePath);
    if (pathStat.isDirectory()) {
      await recursiveFindResolvers(absolutePath, filter, ignore, arr, rootDir);
      return;
    }
    if (!filter.test(part)) {
      return;
    }
    const relativeFromRoot = absolutePath.replace(rootDir, "");
    if (loaderUtils.getIsRpcFile(relativeFromRoot)) {
      arr.push(relativeFromRoot);
      return;
    }
  }));
  return arr.sort();
}

module.exports.collectResolvers = collectResolvers;
module.exports.loader = loader;
module.exports.recursiveFindResolvers = recursiveFindResolvers;
module.exports.transformBlitzRpcServer = transformBlitzRpcServer;
