export const forEachIn = async <
	ItemsType extends Array<any>,
	CallbackType extends (
		item: ItemsType[number],
		index: number
	) => Promise<any>,
	CallbackReturnType = Awaited<ReturnType<CallbackType>>
>(
	items: ItemsType,
	callback: CallbackType,
	options: {
		concurrency?: number;
		onError?: (
			error: any,
			item: ItemsType[number],
			index: number
		) => Promise<void>;
	} = {}
): Promise<CallbackReturnType[]> => {
	const { concurrency = 10, onError } = options;

	const queued = items.slice();
	const completed: CallbackReturnType[] = [];

	const next = async () => {
		const [item] = queued.splice(0, 1);

		if (typeof item === "undefined") return;

		const index = items.indexOf(item);

		try {
			completed[index] = await callback(item, index);
		} catch (error) {
			if (onError) await onError(error, item, index);
			else throw error;
		}

		await next();
	};

	await Promise.all(
		Array.from(Array(Math.min(items.length, concurrency)).keys()).map(next)
	);

	return completed;
};
