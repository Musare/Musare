import { defineStore } from "pinia";

export const useEditSongsStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
	return defineStore(`editSongs-${modalUuid}`, {
		state: () => ({
			youtubeIds: [],
			songPrefillData: {}
		}),
		actions: {
			init({ songs }) {
				this.youtubeIds = songs.map(song => song.youtubeId);
				this.songPrefillData = Object.fromEntries(
					songs.map(song => [
						song.youtubeId,
						song.prefill ? song.prefill : {}
					])
				);
			}
			// 	resetSongs(state) {
			// 	this.youtubeIds = [];
			// 	this.songPrefillData = {};
			// }
		}
	})();
};
