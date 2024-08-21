import { HydratedDocument } from "mongoose";
import ModelCreatedEvent from "../../ModelCreatedEvent";
import ModelDeletedEvent from "../../ModelDeletedEvent";
import ModelUpdatedEvent from "../../ModelUpdatedEvent";
import { NewsStatus } from "./NewsStatus";
import getData from "./getData";
import { NewsSchema, NewsSchemaOptions } from "./schema";
import EventsModule from "@/modules/EventsModule";

export default {
	documentVersion: 3,
	query: {
		published() {
			return this.where({ status: NewsStatus.PUBLISHED });
		},
		newest(showToNewUsers = false) {
			const query = this.published().sort({ createdAt: "desc" });
			if (showToNewUsers)
				return query.where({ showToNewUsers: !!showToNewUsers });
			return query;
		}
	},
	eventListeners: {
		"data.news.created.*": async (event: ModelCreatedEvent) => {
			const { doc }: { doc: HydratedDocument<NewsSchema> } =
				event.getData();

			if (doc.status === NewsStatus.PUBLISHED) {
				const EventClass = EventsModule.getEvent(`data.news.published`);
				await EventsModule.publish(new EventClass({ doc }));
			}
		},
		"data.news.updated.*": async (event: ModelUpdatedEvent) => {
			const {
				doc,
				oldDoc
			}: {
				doc: HydratedDocument<NewsSchema>;
				oldDoc: HydratedDocument<NewsSchema>;
			} = event.getData();

			if (doc.status === oldDoc.status) return;
			if (doc.status === NewsStatus.PUBLISHED) {
				const EventClass = EventsModule.getEvent(`data.news.published`);
				await EventsModule.publish(new EventClass({ doc }));
			} else if (oldDoc.status === NewsStatus.PUBLISHED) {
				const EventClass = EventsModule.getEvent(
					`data.news.unpublished`
				);
				await EventsModule.publish(
					new EventClass({ oldDoc }, doc._id.toString()) // TODO maybe only pass modelId to unpublished event here, or when sending to clients
				);
			}
		},
		"data.news.deleted.*": async (event: ModelDeletedEvent) => {
			const { oldDoc }: { oldDoc: HydratedDocument<NewsSchema> } =
				event.getData();

			if (oldDoc.status === NewsStatus.PUBLISHED) {
				const EventClass = EventsModule.getEvent(
					`data.news.unpublished`
				);
				await EventsModule.publish(
					new EventClass({ oldDoc }, oldDoc._id.toString()) // TODO maybe only pass modelId to unpublished event here, or when sending to clients
				);
			}
		}
	},
	getData
} as NewsSchemaOptions;
