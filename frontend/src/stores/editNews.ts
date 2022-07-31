import { defineStore } from "pinia";

export const useEditNewsStore = props => {
	const { modalUuid } = props;
	return defineStore(`editNews-${modalUuid}`, {
		state: () => ({
			createNews: false,
			newsId: null,
			sector: "admin"
		}),
		actions: {
			init({ createNews, newsId, sector }) {
				if (createNews) this.createNews = createNews;
				if (newsId) this.newsId = newsId;
				if (sector) this.sector = sector;
			}
		}
	})();
};
