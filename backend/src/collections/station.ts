import Schema, { createAttribute, Types } from "../Schema";

export default new Schema({
	document: {
		type: createAttribute({
			type: Types.String,
			enumValues: ["official", "community"]
		}),
		name: createAttribute({
			type: Types.String,
			unique: true,
			min: 2,
			max: 16
		}),
		displayName: createAttribute({
			type: Types.String,
			unique: true,
			min: 2,
			max: 32
		}),
		description: createAttribute({
			type: Types.String,
			min: 2,
			max: 128
		}),
		privacy: createAttribute({
			type: Types.String,
			defaultValue: "private",
			enumValues: ["public", "unlisted", "private"]
		}),
		theme: createAttribute({
			type: Types.String,
			defaultValue: "blue",
			enumValues: ["blue", "purple", "teal", "orange", "red"]
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
			type: Types.ObjectId,
			required: false
		}),
		currentSongIndex: createAttribute({
			type: Types.Number,
			required: false
		}),
		startedAt: createAttribute({
			type: Types.Date,
			required: false
		}),
		paused: createAttribute({
			type: Types.Boolean,
			defaultValue: false
		}),
		timePaused: createAttribute({
			type: Types.Number,
			defaultValue: 0
		}),
		pausedAt: createAttribute({
			type: Types.Date,
			required: false
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
					type: Types.Boolean,
					defaultValue: true
				}),
				access: createAttribute({
					type: Types.String,
					defaultValue: "owner",
					enumValues: ["owner", "user"]
				}),
				limit: createAttribute({
					type: Types.Number,
					defaultValue: 5,
					min: 1,
					max: 50
				})
			}
		}),
		autofill: createAttribute({
			type: Types.Schema,
			schema: {
				enabled: createAttribute({
					type: Types.Boolean,
					defaultValue: true
				}),
				playlists: createAttribute({
					type: Types.Array,
					item: {
						type: Types.ObjectId
					}
				}),
				limit: createAttribute({
					type: Types.Number,
					defaultValue: 30,
					min: 1,
					max: 50
				}),
				mode: createAttribute({
					type: Types.String,
					defaultValue: "random",
					enumValues: ["random", "sequential"]
				})
			}
		})
	},
	version: 9
});
