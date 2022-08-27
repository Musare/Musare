import { defineStore } from "pinia";
import { Song } from "@/types/song";

export const useReportStore = props => {
	const { modalUuid } = props;
	if (!modalUuid) return null;
	return defineStore(`report-${modalUuid}`, {
		state: () => ({
			song: <Song>{}
		}),
		actions: {
			init({ song }) {
				this.song = song;
			}
		}
	})();
};
