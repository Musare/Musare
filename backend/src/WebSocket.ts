import { WebSocket as WSWebSocket } from "ws";
import LogBook, { Log } from "@/LogBook";

export default class WebSocket extends WSWebSocket {
	private _socketId?: string;

	private _sessionId?: string;

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
		LogBook.log({
			message,
			type,
			category: "modules.websocket.socket",
			data
		});
	}

	public getSocketId() {
		return this._socketId;
	}

	public setSocketId(socketId?: string) {
		this._socketId = socketId;
	}

	public getSessionId() {
		return this._sessionId;
	}

	public setSessionId(sessionId?: string) {
		this._sessionId = sessionId;
	}
}
