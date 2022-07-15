import { posix, dirname, join } from 'path';
import { promises } from 'fs';
import { b as buildPageExtensionRegex, t as toPosixPath, a as assertPosixPath, c as convertPageFilePathToRoutePath, d as topLevelFoldersThatMayContainResolvers, g as getIsRpcFile } from './chunks/loader-utils.mjs';
import 'blitz';

async function loader(input) {
  const compiler = this._compiler;
  const id = this.resource;
  const root = this._compiler.context;
  const isSSR = compiler.name === "server";
  if (isSSR) {
    this.cacheable(false);
    const resolvers = await collectResolvers(root, ["ts", "js"]);
    return await transformBlitzRpcServer(input, toPosixPath(id), toPosixPath(root), resolvers, this.query);
  }
  return input;
}
module.exports = loader;
async function transformBlitzRpcServer(src, id, root, resolvers, options) {
  assertPosixPath(id);
  assertPosixPath(root);
  const blitzImport = 'import { __internal_addBlitzRpcResolver } from "@blitzjs/rpc/dist/index-browser.mjs";';
  let code = blitzImport + src;
  code += "\n\n";
  for (let resolverFilePath of resolvers) {
    const relativeResolverPath = posix.relative(dirname(id), join(root, resolverFilePath));
    const routePath = convertPageFilePathToRoutePath(resolverFilePath, options?.resolverBasePath);
    code += `__internal_addBlitzRpcResolver('${routePath}', () => import('${relativeResolverPath}'));`;
    code += "\n";
  }
  return code;
}
function collectResolvers(directory, pageExtensions) {
  return recursiveFindResolvers(directory, buildPageExtensionRegex(pageExtensions));
}
async function recursiveFindResolvers(dir, filter, ignore, arr = [], rootDir = dir) {
  let folders = await promises.readdir(dir);
  if (dir === rootDir) {
    folders = folders.filter((folder) => topLevelFoldersThatMayContainResolvers.includes(folder));
  }
  await Promise.all(folders.map(async (part) => {
    const absolutePath = join(dir, part);
    if (ignore && ignore.test(part))
      return;
    const pathStat = await promises.stat(absolutePath);
    if (pathStat.isDirectory()) {
      await recursiveFindResolvers(absolutePath, filter, ignore, arr, rootDir);
      return;
    }
    if (!filter.test(part)) {
      return;
    }
    const relativeFromRoot = absolutePath.replace(rootDir, "");
    if (getIsRpcFile(relativeFromRoot)) {
      arr.push(relativeFromRoot);
      return;
    }
  }));
  return arr.sort();
}

export { collectResolvers, loader, recursiveFindResolvers, transformBlitzRpcServer };
