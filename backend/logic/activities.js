'use strict';

const coreClass = require("../core");

const async = require('async');
const mongoose = require('mongoose');

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["db", "utils"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.db = this.moduleManager.modules["db"];
			this.io = this.moduleManager.modules["io"];
			this.utils = this.moduleManager.modules["utils"];

			resolve();
		});
	}

	/**
	 * 
	 * @param {String} userId - the id of the user 
	 * @param {String} activityType - what type of activity the user has completed e.g. liked a song
	 * @param {Array} payload - what the activity was specifically related to e.g. the liked song(s)
	 */
	async addActivity(userId, activityType, payload) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			next => {
				const activity = new this.db.models.activity({
					userId,
					activityType,
					payload
				});

				activity.save((err, activity) => {
					if (err) return next(err);
					next(null, activity);
				});
			},

			(activity, next) => {
				this.utils.socketsFromUser(activity.userId, sockets => {
					sockets.forEach(socket => {
						socket.emit('event:activity.create', activity);
					});
				});
			}

		], (err, activity) => {
			// cb(err, activity);
		});
	}
}
