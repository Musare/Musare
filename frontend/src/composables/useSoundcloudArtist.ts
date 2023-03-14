import { ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

const soundcloudArtistPermalinkRegex =
	/^(?<userPermalink>[A-Za-z0-9]+([-_][A-Za-z0-9]+)*)$/;
const soundcloudArtistURLRegex =
	/soundcloud\.com\/(?<userPermalink>[A-Za-z0-9]+([-_][A-Za-z0-9]+)*)/;

export const useSoundcloudArtist = () => {
	const soundcloudArtistURLOrPermalink = ref("");

	const { socket } = useWebsocketsStore();

	const getSoundcloudArtist = async () => {
		const soundcloudArtistURLOrPermalinkTrimmed =
			soundcloudArtistURLOrPermalink.value.trim();

		if (soundcloudArtistURLOrPermalinkTrimmed.length === 0)
			return new Toast(
				"No Soundcloud URL or permalink found in the supplied value."
			);

		const soundcloudArtistPermalinkRegexResult =
			soundcloudArtistPermalinkRegex.exec(
				soundcloudArtistURLOrPermalinkTrimmed
			);
		const soundcloudArtistURLRegexResult = soundcloudArtistURLRegex.exec(
			soundcloudArtistURLOrPermalinkTrimmed
		);

		if (
			!soundcloudArtistPermalinkRegexResult &&
			!soundcloudArtistURLRegexResult
		)
			return new Toast(
				"No Soundcloud URL or permalink found in the supplied value."
			);

		const userPermalink = soundcloudArtistPermalinkRegexResult
			? soundcloudArtistPermalinkRegexResult.groups.userPermalink
			: soundcloudArtistURLRegexResult.groups.userPermalink;

		return new Promise((resolve, reject) => {
			socket.dispatch("soundcloud.getArtist", userPermalink, res => {
				if (res.status === "success") {
					const { data } = res;

					resolve(data);

					soundcloudArtistURLOrPermalink.value = "";
				} else if (res.status === "error") {
					new Toast(res.message);
					reject();
				}
			});
		});
	};

	const getSoundcloudArtistTracks = artistId =>
		new Promise((resolve, reject) => {
			socket.dispatch("soundcloud.getArtistTracks", artistId, res => {
				if (res.status === "success") {
					const { data } = res;

					resolve(data);
				} else if (res.status === "error") {
					new Toast(res.message);
					reject();
				}
			});
		});

	return {
		soundcloudArtistURLOrPermalink,
		getSoundcloudArtist,
		getSoundcloudArtistTracks
	};
};
