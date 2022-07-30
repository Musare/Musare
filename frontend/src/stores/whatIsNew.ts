import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useWhatIsNewStore = props => {
	const { modalUuid } = props;
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
