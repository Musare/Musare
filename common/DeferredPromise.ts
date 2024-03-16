export class DeferredPromise<T = any> {
	promise: Promise<T>;

	reject;

	resolve;

	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.reject = reject;
			this.resolve = resolve;
		});
	}
}
