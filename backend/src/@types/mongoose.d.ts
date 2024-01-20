declare module "mongoose" {
	// Add some additional possible config options to Mongoose's schema options
	interface SchemaOptions<
		DocType = unknown,
		/* eslint-disable */
		TInstanceMethods = {},
		QueryHelpers = {},
		TStaticMethods = {},
		TVirtuals = {},
		/* eslint-enable */
		THydratedDocumentType = HydratedDocument<
			DocType,
			TInstanceMethods,
			QueryHelpers
		>
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
				doc: THydratedDocumentType
			) => Promise<void>;
			[key: `${string}.updated`]: (
				doc: THydratedDocumentType
			) => Promise<void>;
			[key: `${string}.deleted`]: (
				oldDoc: THydratedDocumentType
			) => Promise<void>;
		};
	}
}
