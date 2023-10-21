import config from "config";
import { UserRole } from "@/models/schemas/users/UserRole";

const temp = {
	"data.stations.getData": true,
	"data.news.getData": true,
	"event.model.news.created": true,
	"data.news.create": true,
	"data.news.findById.*": true,
	"data.news.updateById.*": true,
	"data.news.deleteById.*": true
};

const guest = { ...temp };

const user = { ...guest };

const dj = {
	...user,
	"stations.autofill": true,
	"stations.blacklist": true,
	"stations.index": true,
	"stations.playback.toggle": true,
	"stations.queue.remove": true,
	"stations.queue.reposition": true,
	"stations.queue.reset": true,
	"stations.request": true,
	"stations.skip": true,
	"stations.view": true,
	"stations.view.manage": true
};

const owner = {
	...dj,
	"stations.djs.add": true,
	"stations.djs.remove": true,
	"stations.remove": true,
	"stations.update": true
};

const moderator = {
	...owner,
	"admin.view": true,
	"admin.view.import": true,
	"admin.view.news": true,
	"admin.view.playlists": true,
	"admin.view.punishments": true,
	"admin.view.reports": true,
	"admin.view.songs": true,
	"admin.view.stations": true,
	"admin.view.users": true,
	"admin.view.youtubeVideos": true,
	"apis.searchDiscogs": !!config.get("apis.discogs.enabled"),
	"news.create": true,
	"news.update": true,
	"playlists.create.admin": true,
	"playlists.get": true,
	"playlists.update.displayName": true,
	"playlists.update.privacy": true,
	"playlists.songs.add": true,
	"playlists.songs.remove": true,
	"playlists.songs.reposition": true,
	"playlists.view.others": true,
	"punishments.banIP": true,
	"punishments.get": true,
	"reports.get": true,
	"reports.update": true,
	"songs.create": true,
	"songs.get": true,
	"songs.update": true,
	"songs.verify": true,
	"stations.create.official": true,
	"stations.index": false,
	"stations.index.other": true,
	"stations.remove": false,
	"users.get": true,
	"users.ban": true,
	"users.requestPasswordReset": !!config.get("mail.enabled"),
	"users.resendVerifyEmail": !!config.get("mail.enabled"),
	"users.update": true,
	"youtube.requestSetAdmin": true,
	...(config.get("experimental.soundcloud")
		? {
				"admin.view.soundcloudTracks": true,
				"admin.view.soundcloud": true,
				"soundcloud.getArtist": true
		  }
		: {}),
	...(config.get("experimental.spotify")
		? {
				"admin.view.spotify": true,
				"spotify.getTracksFromMediaSources": true,
				"spotify.getAlbumsFromIds": true,
				"spotify.getArtistsFromIds": true,
				"spotify.getAlternativeArtistSourcesForArtists": true,
				"spotify.getAlternativeAlbumSourcesForAlbums": true,
				"spotify.getAlternativeMediaSourcesForTracks": true,
				"admin.view.youtubeChannels": true,
				"youtube.getChannel": true
		  }
		: {})
};

const admin = {
	...moderator,
	"admin.view.dataRequests": true,
	"admin.view.statistics": true,
	"admin.view.youtube": true,
	"dataRequests.resolve": true,
	"media.recalculateAllRatings": true,
	"media.removeImportJobs": true,
	"news.remove": true,
	"playlists.clearAndRefill": true,
	"playlists.clearAndRefillAll": true,
	"playlists.createMissing": true,
	"playlists.deleteOrphaned": true,
	"playlists.removeAdmin": true,
	"playlists.requestOrphanedPlaylistSongs": true,
	"punishments.deactivate": true,
	"reports.remove": true,
	"songs.remove": true,
	"songs.updateAll": true,
	"stations.clearEveryStationQueue": true,
	"stations.remove": true,
	"users.remove": true,
	"users.remove.sessions": true,
	"users.update.restricted": true,
	"utils.getModules": true,
	"youtube.getApiRequest": true,
	"youtube.getMissingVideos": true,
	"youtube.resetStoredApiRequests": true,
	"youtube.removeStoredApiRequest": true,
	"youtube.removeVideos": true,
	"youtube.updateVideosV1ToV2": true,
	...(config.get("experimental.soundcloud")
		? {
				"soundcloud.fetchNewApiKey": true,
				"soundcloud.testApiKey": true
		  }
		: {}),
	...(config.get("experimental.spotify")
		? {
				"youtube.getMissingChannels": true
		  }
		: {})
};

const permissions: Record<
	UserRole | "owner" | "dj" | "guest",
	Record<string, boolean>
> = { guest, user, dj, owner, moderator, admin };

export default permissions;
