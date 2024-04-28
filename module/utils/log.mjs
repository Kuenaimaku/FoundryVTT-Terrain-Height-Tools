export function log(message, ...args) {
	console.log(`Terrain Height Tools | ${message}`, ...args);
}

export function debug(message, ...args) {
	console.debug(`Terrain Height Tools | ${message}`, ...args);
}
