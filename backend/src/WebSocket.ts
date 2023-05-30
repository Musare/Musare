import { WebSocket as WSWebSocket } from "ws";
import LogBook, { Log } from "./LogBook";

export default class WebSocket extends WSWebSocket {
	protected logBook: LogBook = LogBook.getPrimaryInstance();

	public dispatch(name: string, ...args: any[]) {
		this.send(JSON.stringify([name, ...args]));
	}

	/**
	 * log - Add log to logbook
	 *
	 * @param log - Log message or object
	 */
	public log(log: string | Omit<Log, "timestamp" | "category">) {
		const {
			message,
			type = undefined,
			data = {}
		} = {
			...(typeof log === "string" ? { message: log } : log)
		};
		this.logBook.log({
			message,
			type,
			category: "modules.websocket.socket",
			data
		});
	}
}
