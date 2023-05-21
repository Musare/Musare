import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;
const SpotifyModule = moduleManager.modules.spotify;

export default {
	/**
	 * Fetches tracks from media sources
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Array} mediaSources - the media sources to get tracks for
	 * @returns {{status: string, data: object}}
	 */
	getTracksFromMediaSources: useHasPermission(
		"spotify.getTracksFromMediaSources",
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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Array} albumIds - the ids of the Spotify albums to get
	 * @returns {{status: string, data: object}}
	 */
	getAlbumsFromIds: useHasPermission("spotify.getAlbumsFromIds", function getAlbumsFromIds(session, albumIds, cb) {
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
	}),

	/**
	 * Fetches artists from ids
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Array} artistIds - the ids of the Spotify artists to get
	 * @returns {{status: string, data: object}}
	 */
	getArtistsFromIds: useHasPermission(
		"spotify.getArtistsFromIds",
		function getArtistsFromIds(session, artistIds, cb) {
			SpotifyModule.runJob("GET_ARTISTS_FROM_IDS", { artistIds }, this)
				.then(artists => {
					this.log("SUCCESS", "SPOTIFY_GET_ARTISTS_FROM_IDS", `Getting artists from ids was successful.`);
					return cb({ status: "success", data: { artists } });
				})
				.catch(async err => {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SPOTIFY_GET_ARTISTS_FROM_IDS", `Getting artists from ids failed. "${err}"`);
					return cb({ status: "error", message: err });
				});
		}
	)
};
