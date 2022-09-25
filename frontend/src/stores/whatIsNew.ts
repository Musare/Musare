import { defineStore } from "pinia";

export const useWhatIsNewStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`whatIsNew-${modalUuid}`, {
		state: () => ({
			news: null
		}),
		actions: {
			init({ news }) {
				this.news = news;
			}
		}
	})();
