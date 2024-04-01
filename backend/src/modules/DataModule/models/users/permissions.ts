import config from "config";
import { UserRole } from "@/modules/DataModule/models/users/UserRole";

const guest = {};

const user = { ...guest };

const dj = { ...user };

const owner = { ...dj };

const moderator = {
	...owner,

	// DataModule importJobs model
	"data.importJobs.create": true,
	"data.importJobs.findById.*": true,
	"data.importJobs.getData": true,
	"data.importJobs.deleteById.*": true,
	"data.importJobs.updateById.*": true,

	// DataModule news model
	"data.news.create": true,
	"data.news.getData": true,
	"data.news.updateById.*": true,
	"data.news.findManyById.*": true,

	// DataModule playlists model
	"data.playlists.addSongById.*": true,
	"data.playlists.create.admin": true,
	"data.playlists.findById.*": true,
	"data.playlists.getData": true,
	"data.playlists.removeSongById.*": true,
	"data.playlists.repositionSongById.*": true,
	"data.playlists.updateDisplayNameById.*": true,
	"data.playlists.updatePrivacyById.*": true,

	// DataModule punishments model
	"data.punishments.banIP": true,
	"data.punishments.findById.*": true,
	"data.punishments.getData": true,

	// DataModule reports model
	"data.reports.findById.*": true,
	"data.reports.getData": true,
	"data.reports.updateById.*": true,

	// DataModule songs model
	"data.songs.create": true,
	"data.songs.findById.*": true,
	"data.songs.getData": true,
	"data.songs.updateById.*": true,
	"data.songs.verifyById.*": true,

	// DataModule stations model
	"data.stations.create.official": true,
	"data.stations.findById.*": true,
	"data.stations.getData": true,
	"data.stations.index.adminFilter": true,
	"data.stations.updateById.*": true,
	"data.stations.findManyById.*": true,

	// DataModule users model
	"data.users.banById.*": true,
	"data.users.findById.*": true,
	"data.users.getData": true,
	"data.users.requestPasswordResetById.*": !!config.get("mail.enabled"),
	"data.users.resendVerifyEmailById.*": !!config.get("mail.enabled"),
	"data.users.updateById.*": true,
	// "data.users.findManyById.*": true,

	// DataModule youtubeVideos model
	"data.youtubeVideos.getData": true,
	"data.youtubeVideos.requestSet": true,

	// DiscogsModule
	"discogs.search": !!config.get("apis.discogs.enabled"),

	// Frontend admin views
	"admin.view": true,
	"admin.view.import": true,
	"admin.view.news": true,
	"admin.view.playlists": true,
	"admin.view.punishments": true,
	"admin.view.reports": true,
	"admin.view.songs": true,
	"admin.view.stations": true,
	"admin.view.users": true,
	"admin.view.youtubeVideos": true

	// // Experimental SoundCloud
	// ...(config.get("experimental.soundcloud")
	// 	? {
	// 			"admin.view.soundcloudTracks": true,
	// 			"admin.view.soundcloud": true,
	// 			"soundcloud.getArtist": true
	// 	  }
	// 	: {}),

	// // Experimental Spotify
	// ...(config.get("experimental.spotify")
	// 	? {
	// 			"admin.view.spotify": true,
	// 			"spotify.getTracksFromMediaSources": true,
	// 			"spotify.getAlbumsFromIds": true,
	// 			"spotify.getArtistsFromIds": true,
	// 			"spotify.getAlternativeArtistSourcesForArtists": true,
	// 			"spotify.getAlternativeAlbumSourcesForAlbums": true,
	// 			"spotify.getAlternativeMediaSourcesForTracks": true,
	// 			"admin.view.youtubeChannels": true,
	// 			"youtube.getChannel": true
	// 	  }
	// 	: {})
};

const admin = {
	...moderator,

	// DataModule dataRequests model
	"data.dataRequests.findById.*": true,
	"data.dataRequests.getData": true,
	"data.dataRequests.resolveById.*": true,

	// DataModule importJobs model
	"data.importJobs.deleteById.*": true,

	// DataModule news model
	"data.news.deleteById.*": true,
	"data.news.deleteManyById.*": true,

	// DataModule playlists model
	"data.playlists.clearAndRefillById.*": true,
	"data.playlists.clearAndRefillAll": true,
	"data.playlists.createMissing": true,
	"data.playlists.deleteOrphaned": true,
	"data.playlists.deleteById.*": true,
	"data.playlists.requestOrphanedPlaylistSongs": true,

	// DataModule punishments model
	"data.punishments.deactivateById.*": true,

	// DataModule ratings model
	"data.ratings.recalculateAll": true,

	// DataModule reports model
	"data.reports.deleteById.*": true,

	// DataModule songs model
	"data.songs.deleteById.*": true,
	"data.songs.updateAll": true,

	// DataModule stations model
	"data.stations.clearEveryStationQueue": true,
	"data.stations.deleteById.*": true,
	"data.stations.deleteManyById.*": true,

	// DataModule users model
	"data.users.deleteById.*": true,
	"data.users.deleteSessionsById.*": true,
	"data.users.updateById.*": true,
	"data.users.deleteManyById.*": true,

	// DataModule youtubeApiRequests model
	"data.youtubeApiRequests.findById.*": true,
	"data.youtubeApiRequests.getData": true,
	"data.youtubeApiRequests.deleteAll": true,
	"data.youtubeApiRequests.deleteById.*": true,

	// DataModule youtubeVideos model
	"data.youtubeVideos.getMissing": true,
	"data.youtubeVideos.deleteById.*": true,
	"data.youtubeVideos.migrateV1ToV2.*": true,

	// Frontend admin views
	"admin.view.dataRequests": true,
	"admin.view.statistics": true,
	"admin.view.youtube": true,

	// // Experimental SoundCloud
	// ...(config.get("experimental.soundcloud")
	// 	? {
	// 			"soundcloud.fetchNewApiKey": true,
	// 			"soundcloud.testApiKey": true
	// 	  }
	// 	: {}),

	// // Experimental Spotify
	// ...(config.get("experimental.spotify")
	// 	? {
	// 			"youtube.getMissingChannels": true
	// 	  }
	// 	: {})

	"event.model.news.created": true // WIP - regular users need to be able to subscribe to certain news subscribe events
};

const permissions: Record<
	UserRole | "owner" | "dj" | "guest",
	Record<string, boolean>
> = {
	guest,
	user,
	dj,
	owner,
	moderator,
	admin
};

export default permissions;
