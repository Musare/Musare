import Schema, { createAttribute, Types } from "../Schema";

export default new Schema({
	document: {
		name: createAttribute({
			type: Types.String,
			restricted: true
		}),
		autofill: createAttribute({
			type: Types.Schema,
			schema: {
				enabled: createAttribute({
					type: Types.Boolean,
					required: false
				})
			}
		}),
		someNumbers: createAttribute({
			type: Types.Array,
			item: {
				type: Types.Number
			}
		}),
		songs: createAttribute({
			type: Types.Array,
			item: {
				type: Types.Schema,
				schema: {
					_id: createAttribute({ type: Types.ObjectId })
				}
			}
		}),
		aNumber: createAttribute({ type: Types.Number })
	}
});
