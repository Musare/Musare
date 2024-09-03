import News from "@models/News";
import { NewsStatus } from "@models/News/NewsStatus";

/**
 * Simply used to check if a news model exists and is published
 */
export default (model?: News) => model && model.status === NewsStatus.PUBLISHED;
