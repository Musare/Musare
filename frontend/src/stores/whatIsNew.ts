import { defineStore } from "pinia";

export const useWhatIsNewStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
	return defineStore(`whatIsNew-${modalUuid}`, {
		state: () => ({
			news: null
		}),
		actions: {
			init({ news }) {
				this.news = news;
			}
		}
	})();
};
