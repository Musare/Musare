import Schema, { createAttribute, Types } from "../Schema";

export default new Schema({
	document: {
		type: createAttribute({
			type: Types.String
		}),
		name: createAttribute({
			type: Types.String
		}),
		displayName: createAttribute({
			type: Types.String
		}),
		description: createAttribute({
			type: Types.String
		}),
		privacy: createAttribute({
			type: Types.String
		}),
		theme: createAttribute({
			type: Types.String
		}),
		owner: createAttribute({
			type: Types.ObjectId
		}),
		djs: createAttribute({
			type: Types.Array,
			item: {
				type: Types.ObjectId
			}
		}),
		currentSong: createAttribute({
			type: Types.ObjectId
		}),
		currentSongIndex: createAttribute({
			type: Types.Number
		}),
		startedAt: createAttribute({
			type: Types.Date
		}),
		paused: createAttribute({
			type: Types.Boolean
		}),
		timePaused: createAttribute({
			type: Types.Number
		}),
		pausedAt: createAttribute({
			type: Types.Date
		}),
		playlist: createAttribute({
			type: Types.ObjectId
		}),
		queue: createAttribute({
			type: Types.Array,
			item: {
				type: Types.ObjectId
			}
		}),
		blacklist: createAttribute({
			type: Types.Array,
			item: {
				type: Types.ObjectId
			}
		}),
		requests: createAttribute({
			type: Types.Schema,
			schema: {
				enabled: createAttribute({
					type: Types.Boolean
				}),
				access: createAttribute({
					type: Types.String
				}),
				limit: createAttribute({
					type: Types.Number
				})
			}
		}),
		autofill: createAttribute({
			type: Types.Schema,
			schema: {
				enabled: createAttribute({
					type: Types.Boolean
				}),
				playlists: createAttribute({
					type: Types.Array,
					item: {
						type: Types.ObjectId
					}
				}),
				limit: createAttribute({
					type: Types.Number
				}),
				mode: createAttribute({
					type: Types.String
				})
			}
		})
	},
	version: 9
});
