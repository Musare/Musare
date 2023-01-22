import mongoose from "mongoose";
import async from "async";

import isLoginRequired from "../hooks/loginRequired";
import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const SoundcloudModule = moduleManager.modules.soundcloud;
const SpotifyModule = moduleManager.modules.spotify;

export default {
	/**
	 * Fetches tracks from media sources
	 *
	 * @returns {{status: string, data: object}}
	 */
	getTracksFromMediaSources: useHasPermission(
		"admin.view.spotify",
		function getTracksFromMediaSources(session, mediaSources, cb) {
			SpotifyModule.runJob("GET_TRACKS_FROM_MEDIA_SOURCES", { mediaSources }, this)
				.then(response => {
					this.log(
						"SUCCESS",
						"SPOTIFY_GET_TRACKS_FROM_MEDIA_SOURCES",
						`Getting tracks from media sources was successful.`
					);
					return cb({ status: "success", data: { tracks: response.tracks } });
				})
				.catch(async err => {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SPOTIFY_GET_TRACKS_FROM_MEDIA_SOURCES",
						`Getting tracks from media sources failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				});
		}
	),

	/**
	 * Fetches albums from ids
	 *
	 * @returns {{status: string, data: object}}
	 */
	getAlbumsFromIds: useHasPermission("admin.view.spotify", function getTracksFromMediaSources(session, albumIds, cb) {
		SpotifyModule.runJob("GET_ALBUMS_FROM_IDS", { albumIds }, this)
			.then(albums => {
				this.log("SUCCESS", "SPOTIFY_GET_ALBUMS_FROM_IDS", `Getting albums from ids was successful.`);
				return cb({ status: "success", data: { albums } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SPOTIFY_GET_ALBUMS_FROM_IDS", `Getting albums from ids failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	})
};
