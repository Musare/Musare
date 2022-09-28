import { NewsModel } from "@musare_types/models/News";
import { defineStore } from "pinia";

export const useWhatIsNewStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`whatIsNew-${modalUuid}`, {
		state: (): {
			news: NewsModel;
		} => ({
			news: null
		}),
		actions: {
			init({ news }: { news: NewsModel }) {
				this.news = news;
			}
		}
	})();
