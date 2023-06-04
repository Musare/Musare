import config from "config";
import express from "express";
import http, { Server, IncomingMessage } from "node:http";
import { RawData, WebSocketServer } from "ws";
import BaseModule from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import WebSocket from "../WebSocket";

export default class WebSocketModule extends BaseModule {
	private httpServer?: Server;

	private wsServer?: WebSocketServer;

	private keepAliveInterval?: NodeJS.Timer;

	/**
	 * WebSocket Module
	 */
	public constructor() {
		super("websocket");
	}

	/**
	 * startup - Startup websocket module
	 */
	public override async startup() {
		await super.startup();

		this.httpServer = http
			.createServer(express())
			.listen(config.get("port"));

		this.wsServer = new WebSocketServer({
			server: this.httpServer,
			path: "/ws",
			WebSocket
		});

		this.wsServer.on(
			"connection",
			(socket: WebSocket, request: IncomingMessage) =>
				this.handleConnection(socket, request)
		);

		this.keepAliveInterval = setInterval(() => this.keepAlive(), 45000);

		this.wsServer.on("close", async () =>
			clearInterval(this.keepAliveInterval)
		);

		await super.started();
	}

	/**
	 * keepAlive - Ping open clients and terminate closed
	 */
	private async keepAlive() {
		if (!this.wsServer) return;

		for await (const clients of this.wsServer.clients.entries()) {
			await Promise.all(
				clients.map(async socket => {
					switch (socket.readyState) {
						case socket.OPEN:
							socket.ping();
							break;
						case socket.CLOSED:
							socket.terminate();
							break;
						default:
							break;
					}
				})
			);
		}
	}

	/**
	 * handleConnection - Handle websocket connection
	 */
	private async handleConnection(
		socket: WebSocket,
		request: IncomingMessage
	) {
		if (this.jobQueue.getStatus().isPaused) {
			socket.close();
			return;
		}

		socket.log({ type: "debug", message: "WebSocket #ID connected" });

		socket.setSocketId(request.headers["sec-websocket-key"]);

		const sessionCookie = request.headers.cookie
			?.split("; ")
			.find(
				cookie =>
					cookie.substring(0, cookie.indexOf("=")) ===
					config.get("cookie")
			);
		const sessionId = sessionCookie?.substring(
			sessionCookie.indexOf("=") + 1,
			sessionCookie.length
		);
		socket.setSessionId(sessionId);

		socket.on("error", error =>
			socket.log({
				type: "error",
				message: error.message,
				data: { error }
			})
		);

		socket.on("close", () =>
			socket.log({ type: "debug", message: "WebSocket #ID closed" })
		);

		const readyData = {
			config: {
				cookie: config.get("cookie"),
				sitename: config.get("sitename"),
				recaptcha: {
					enabled: config.get("apis.recaptcha.enabled"),
					key: config.get("apis.recaptcha.key")
				},
				githubAuthentication: config.get("apis.github.enabled"),
				messages: config.get("messages"),
				christmas: config.get("christmas"),
				footerLinks: config.get("footerLinks"),
				shortcutOverrides: config.get("shortcutOverrides"),
				registrationDisabled: config.get("registrationDisabled"),
				mailEnabled: config.get("mail.enabled"),
				discogsEnabled: config.get("apis.discogs.enabled"),
				experimental: {
					changable_listen_mode: config.get(
						"experimental.changable_listen_mode"
					),
					media_session: config.get("experimental.media_session"),
					disable_youtube_search: config.get(
						"experimental.disable_youtube_search"
					),
					station_history: config.get("experimental.station_history"),
					soundcloud: config.get("experimental.soundcloud"),
					spotify: config.get("experimental.spotify")
				}
			},
			user: { loggedIn: false }
		};

		socket.dispatch("ready", readyData);

		socket.on("message", message => this.handleMessage(socket, message));
	}

	/**
	 * handleMessage - Handle websocket message
	 */
	private async handleMessage(socket: WebSocket, message: RawData) {
		if (this.jobQueue.getStatus().isPaused) {
			socket.close();
			return;
		}

		try {
			const data = JSON.parse(message.toString());

			if (!Array.isArray(data) || data.length < 1)
				throw new Error("Invalid request");

			const [moduleJob, payload, options] = data;
			const [moduleName, jobName] = moduleJob.split(".");
			const { CB_REF } = options ?? payload ?? {};

			const res = await this.jobQueue.runJob("api", "runJob", {
				moduleName,
				jobName,
				payload,
				socketId: socket.getSocketId(),
				sessionId: socket.getSessionId()
			});

			socket.dispatch("CB_REF", CB_REF, res);
		} catch (error) {
			const message = error?.message ?? error;

			this.log({ type: "error", message });

			socket.dispatch("ERROR", error?.message ?? error);
		}
	}

	/**
	 * shutdown - Shutdown websocket module
	 */
	public override async shutdown() {
		await super.shutdown();

		if (this.httpServer) this.httpServer.close();
		if (this.wsServer) this.wsServer.close();
	}
}

export type WebSocketModuleJobs = {
	[Property in keyof UniqueMethods<WebSocketModule>]: {
		payload: Parameters<UniqueMethods<WebSocketModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<WebSocketModule>[Property]>>;
	};
};
