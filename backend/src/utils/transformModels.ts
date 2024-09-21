/* eslint no-use-before-define: 0 */

import { Model } from "sequelize";

const handleModel = (model: Model) => {
	const result = model.toJSON();

	Object.entries(result._associations ?? {}).forEach(([property, name]) => {
		result[property] = {
			_id: result[property],
			_name: name
		};
	});

	delete result._associations;

	return result;
};

const handleItem = (item: any) => {
	if (!item) return item;
	if (Array.isArray(item)) return handleArray(item);
	if (item instanceof Model) return handleModel(item);
	if (typeof item === "object" && item.constructor.name === "Object")
		return handleObject(item);
	return item;
};

const handleArray = (array: any[]): any[] => array.map(handleItem);

const handleObject = (object: object): object =>
	Object.fromEntries(
		Object.entries(object).map(([key, value]) => [key, handleItem(value)])
	);

// Replaces association properties to include info about the association
export default (response: unknown) => handleItem(response);
