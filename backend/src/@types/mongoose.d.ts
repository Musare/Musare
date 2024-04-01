import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

declare module "mongoose" {
	// Add some additional possible config options to Mongoose's schema options
	interface SchemaOptions<
		DocType = unknown,
		/* eslint-disable */
		TInstanceMethods = {},
		QueryHelpers = {},
		TStaticMethods = {},
		TVirtuals = {},
		THydratedDocumentType = HydratedDocument<
			DocType,
			TInstanceMethods,
			QueryHelpers
		>
		/* eslint-enable */
	> {
		patchHistory?: {
			enabled: boolean;
			patchHistoryDisabled?: boolean;
			eventCreated?: string;
			eventUpdated?: string;
			eventDeleted?: string;
		};

		getData?: {
			enabled: boolean;
			blacklistedProperties?: string[];
			specialProperties?: Record<string, PipelineStage[]>;
			specialQueries?: Record<
				string,
				(query: Record<string, any>) => Record<string, any>
			>;
			specialFilters?: Record<
				string,
				(...args: any[]) => PipelineStage[]
			>;
		};

		documentVersion?: number;

		eventListeners?: {
			[key: `${string}.created`]: (
				event: ModelCreatedEvent
			) => Promise<void>;
			[key: `${string}.updated`]: (
				event: ModelUpdatedEvent
			) => Promise<void>;
			[key: `${string}.deleted`]: (
				event: ModelDeletedEvent
			) => Promise<void>;
		};
	}
}
