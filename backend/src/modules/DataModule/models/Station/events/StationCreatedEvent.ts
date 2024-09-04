import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import Station from "../../Station";

export default abstract class StationCreatedEvent extends ModelCreatedEvent {
	protected static _model = Station;

	protected static _hasPermission = isAdmin;
}
