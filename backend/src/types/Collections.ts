import { Collection } from "mongodb";
import Schema from "../Schema";

export type Collections = Record<
	"abc" | "station",
	{
		schema: Schema;
		collection: Collection;
	}
>;
