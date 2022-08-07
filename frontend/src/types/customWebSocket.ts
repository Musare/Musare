import ListenerHandler from "@/classes/ListenerHandler.class";
// TODO: Replace
export interface CustomWebSocket extends WebSocket {
	dispatcher: ListenerHandler;
	on(target, cb, options?: any): void;
	dispatch(...args): void;
}
