'use strict';

const blitz = require('blitz');
const path = require('path');

function assertPosixPath(path$1) {
	const errMsg = `Wrongly formatted path: ${path$1}`;
	blitz.assert(!path$1.includes(path.win32.sep), errMsg);
}
function toPosixPath(path$1) {
	if (process.platform !== 'win32') {
		blitz.assert(path.sep === path.posix.sep, 'TODO');
		assertPosixPath(path$1);
		return path$1;
	} else {
		blitz.assert(path.sep === path.win32.sep, 'TODO');
		const pathPosix = path$1.split(path.win32.sep).join(path.posix.sep);
		assertPosixPath(pathPosix);
		return pathPosix;
	}
}
const topLevelFoldersThatMayContainResolvers = ['src', 'app', 'integrations'];
function buildPageExtensionRegex(pageExtensions) {
	return new RegExp(`(?<!\\.test|\\.spec)\\.(?:${pageExtensions.join('|')})$`);
}
const fileExtensionRegex = /\.([a-z]+)$/;
function convertPageFilePathToRoutePath(filePath, resolverBasePath) {
	if (resolverBasePath === 'root') {
		return filePath.replace(fileExtensionRegex, '');
	}
	return filePath
		.replace(/^.*?[\\/]queries[\\/]/, '/')
		.replace(/^.*?[\\/]mutations[\\/]/, '/')
		.replace(fileExtensionRegex, '');
}
function convertFilePathToResolverName(filePathFromAppRoot) {
	return filePathFromAppRoot
		.replace(/^.*[\\/](queries|mutations)[\\/]/, '')
		.replace(fileExtensionRegex, '');
}
function convertFilePathToResolverType(filePathFromAppRoot) {
	return filePathFromAppRoot.match(/[\\/]queries[\\/]/) ? 'query' : 'mutation';
}
function getIsRpcFile(filePathFromAppRoot) {
	return (
		/[\\/]queries[\\/]/.test(filePathFromAppRoot) || /[\\/]mutations[\\/]/.test(filePathFromAppRoot)
	);
}

exports.assertPosixPath = assertPosixPath;
exports.buildPageExtensionRegex = buildPageExtensionRegex;
exports.convertFilePathToResolverName = convertFilePathToResolverName;
exports.convertFilePathToResolverType = convertFilePathToResolverType;
exports.convertPageFilePathToRoutePath = convertPageFilePathToRoutePath;
exports.getIsRpcFile = getIsRpcFile;
exports.toPosixPath = toPosixPath;
exports.topLevelFoldersThatMayContainResolvers = topLevelFoldersThatMayContainResolvers;
