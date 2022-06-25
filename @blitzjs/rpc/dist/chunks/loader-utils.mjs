import { assert } from 'blitz';
import { win32, sep, posix } from 'path';

function assertPosixPath(path) {
  const errMsg = `Wrongly formatted path: ${path}`;
  assert(!path.includes(win32.sep), errMsg);
}
function toPosixPath(path) {
  if (process.platform !== "win32") {
    assert(sep === posix.sep, "TODO");
    assertPosixPath(path);
    return path;
  } else {
    assert(sep === win32.sep, "TODO");
    const pathPosix = path.split(win32.sep).join(posix.sep);
    assertPosixPath(pathPosix);
    return pathPosix;
  }
}
const topLevelFoldersThatMayContainResolvers = ["src", "app", "integrations"];
function buildPageExtensionRegex(pageExtensions) {
  return new RegExp(`(?<!\\.test|\\.spec)\\.(?:${pageExtensions.join("|")})$`);
}
const fileExtensionRegex = /\.([a-z]+)$/;
function convertPageFilePathToRoutePath(filePath, resolverBasePath) {
  if (resolverBasePath === "root") {
    return filePath.replace(fileExtensionRegex, "");
  }
  return filePath.replace(/^.*?[\\/]queries[\\/]/, "/").replace(/^.*?[\\/]mutations[\\/]/, "/").replace(fileExtensionRegex, "");
}
function convertFilePathToResolverName(filePathFromAppRoot) {
  return filePathFromAppRoot.replace(/^.*[\\/](queries|mutations)[\\/]/, "").replace(fileExtensionRegex, "");
}
function convertFilePathToResolverType(filePathFromAppRoot) {
  return filePathFromAppRoot.match(/[\\/]queries[\\/]/) ? "query" : "mutation";
}
function getIsRpcFile(filePathFromAppRoot) {
  return /[\\/]queries[\\/]/.test(filePathFromAppRoot) || /[\\/]mutations[\\/]/.test(filePathFromAppRoot);
}

export { assertPosixPath as a, buildPageExtensionRegex as b, convertPageFilePathToRoutePath as c, topLevelFoldersThatMayContainResolvers as d, convertFilePathToResolverName as e, convertFilePathToResolverType as f, getIsRpcFile as g, toPosixPath as t };
