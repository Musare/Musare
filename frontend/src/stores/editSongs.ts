/* eslint no-param-reassign: 0 */

import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useEditSongsStore = props => {
	const { modalUuid } = props;
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
