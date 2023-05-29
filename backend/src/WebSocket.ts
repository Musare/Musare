import { WebSocket as WSWebSocket } from "ws";

export default class WebSocket extends WSWebSocket {
	public dispatch(name: string, ...args: any[]) {
		this.send(JSON.stringify([name, ...args]));
	}
}
