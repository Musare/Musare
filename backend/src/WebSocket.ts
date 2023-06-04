import { WebSocket as WSWebSocket } from "ws";
import LogBook, { Log } from "./LogBook";

export default class WebSocket extends WSWebSocket {
	protected logBook: LogBook = LogBook.getPrimaryInstance();

	protected socketId?: string;

	protected sessionId?: string;

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

	public getSocketId() {
		return this.socketId;
	}

	public setSocketId(socketId?: string) {
		this.socketId = socketId;
	}

	public getSessionId() {
		return this.sessionId;
	}

	public setSessionId(sessionId?: string) {
		this.sessionId = sessionId;
	}
}
