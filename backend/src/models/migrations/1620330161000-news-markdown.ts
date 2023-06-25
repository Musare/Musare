import Migration from "../Migration";

export default class Migration1620330161000 extends Migration {
	async up() {
		const News = this._getDb().collection("news");

		const newsItems = News.find({ documentVersion: 1 }).stream();

		for await (const newsItem of newsItems) {
			newsItem.markdown = `# ${newsItem.title}\n\n`;
			newsItem.markdown += `## ${newsItem.description}\n\n`;

			if (newsItem.bugs) {
				newsItem.markdown += `**Bugs:**\n\n${newsItem.bugs.join(
					", "
				)}\n\n`;
			}

			if (newsItem.features) {
				newsItem.markdown += `**Features:**\n\n${newsItem.features.join(
					", "
				)}\n\n`;
			}

			if (newsItem.improvements) {
				newsItem.markdown += `**Improvements:**\n\n${newsItem.improvements.join(
					", "
				)}\n\n`;
			}

			if (newsItem.upcoming) {
				newsItem.markdown += `**Upcoming:**\n\n${newsItem.upcoming.join(
					", "
				)}\n`;
			}

			await News.updateOne(
				{ _id: newsItem._id },
				{
					$set: {
						markdown: newsItem.markdown,
						status: "published",
						documentVersion: 2
					},
					$unset: {
						description: "",
						bugs: "",
						features: "",
						improvements: "",
						upcoming: ""
					}
				}
			);
		}
	}

	async down() {}
}
