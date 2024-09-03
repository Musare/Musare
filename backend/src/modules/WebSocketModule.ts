import config from "config";
import express from "express";
import http, { Server, IncomingMessage } from "node:http";
import { RawData, WebSocketServer } from "ws";
import { Types, isObjectIdOrHexString } from "mongoose";
import { forEachIn } from "@common/utils/forEachIn";
import { getErrorMessage } from "@common/utils/getErrorMessage";
import BaseModule from "@/BaseModule";
import WebSocket from "@/WebSocket";
import ModuleManager from "@/ModuleManager";
import JobQueue from "@/JobQueue";
import DataModule from "./DataModule";
import EventsModule from "./EventsModule";
import User from "./DataModule/models/User";
import Session from "./DataModule/models/Session";
// import assertEventDerived from "@/utils/assertEventDerived";

export class WebSocketModule extends BaseModule {
	private _httpServer?: Server;

	private _wsServer?: WebSocketServer;

	private _keepAliveInterval?: NodeJS.Timeout;

	/**
	 * WebSocket Module
	 */
	public constructor() {
		super("websocket");

		this._dependentModules = ["data", "events"];
	}

	/**
	 * startup - Startup websocket module
	 */
	public override async startup() {
		await super.startup();

		this._httpServer = http
			.createServer(express())
			.listen(config.get("port"));

		this._wsServer = new WebSocketServer({
			server: this._httpServer,
			path: "/ws",
			WebSocket
		});

		this._wsServer.on(
			"connection",
			(socket: WebSocket, request: IncomingMessage) =>
				this._handleConnection(socket, request)
		);

		this._keepAliveInterval = setInterval(() => this._keepAlive(), 45000);

		this._wsServer.on("close", async () =>
			clearInterval(this._keepAliveInterval)
		);

		await EventsModule.pSubscribe("events.job.completed:*", async event => {
			// assertEventDerived(event);
			const data = event.getData();
			const { socketId, callbackRef } = data;

			if (!socketId || !callbackRef) return;

			delete data.socketId;
			delete data.callbackRef;

			this.dispatch(socketId, "jobCallback", callbackRef, data);
		});

		await super._started();
	}

	/**
	 * keepAlive - Ping open clients and terminate closed
	 */
	private async _keepAlive() {
		if (!this._wsServer) return;

		for await (const clients of this._wsServer.clients.entries()) {
			await forEachIn(clients, async socket => {
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
			});
		}
	}

	/**
	 * handleConnection - Handle websocket connection
	 */
	private async _handleConnection(
		socket: WebSocket,
		request: IncomingMessage
	) {
		if (JobQueue.getStatus().isPaused) {
			socket.close();
			return;
		}

		socket.setSocketId(request.headers["sec-websocket-key"]);

		let sessionId;
		let user;

		if (request.headers.cookie) {
			sessionId = request.headers.cookie
				.split("; ")
				.find(
					cookie =>
						cookie.substring(0, cookie.indexOf("=")) ===
						config.get<string>("cookie")
				);

			sessionId = sessionId?.substring(
				sessionId.indexOf("=") + 1,
				sessionId.length
			);
		}

		if (sessionId && isObjectIdOrHexString(sessionId)) {
			socket.setSessionId(sessionId);

			const Session = await DataModule.getModel<Session>("sessions");

			await Session.update(
				{
					updatedAt: new Date()
				},
				{
					where: {
						sessionId
					}
				}
			);
			const session = await Session.findByPk(sessionId); // pk = primary key

			if (session) {
				const User = await DataModule.getModel<User>("users");

				user = await User.findByPk(session.userId);
			}
		}

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
			user
		};

		socket.log({
			type: "debug",
			message: `WebSocket opened #${socket.getSocketId()}`
		});

		socket.on("error", error =>
			socket.log({
				type: "error",
				message: error.message,
				data: { error }
			})
		);

		socket.on("close", async () => {
			const socketId = socket.getSocketId();

			const Job = EventsModule.getJob("unsubscribeAll");

			await JobQueue.runJob(Job, undefined, {
				socketId
			});

			socket.log({
				type: "debug",
				message: `WebSocket closed #${socketId}`
			});
		});

		socket.dispatch("ready", readyData);

		socket.on("message", message => this._handleMessage(socket, message));
	}

	/**
	 * handleMessage - Handle websocket message
	 */
	private async _handleMessage(socket: WebSocket, message: RawData) {
		if (JobQueue.getStatus().isPaused) {
			socket.close();
			return;
		}

		let callbackRef;

		try {
			const data = JSON.parse(message.toString());

			if (!Array.isArray(data) || data.length < 1)
				throw new Error("Invalid request");

			const [moduleJob, _payload, options] = data;
			const moduleName = moduleJob.substring(0, moduleJob.indexOf("."));
			const jobName = moduleJob.substring(moduleJob.indexOf(".") + 1);

			const { callbackRef } = options ?? _payload ?? {};

			if (!callbackRef)
				throw new Error(
					`No callback reference provided for job ${moduleJob}`
				);

			const module = ModuleManager.getModule(moduleName);
			if (!module) throw new Error(`Module "${moduleName}" not found`);

			const Job = module.getJob(jobName);
			if (!Job?.isApiEnabled())
				throw new Error(`Job "${jobName}" not found.`);

			let session;
			if (socket.getSessionId()) {
				const Session = await DataModule.getModel<Session>("sessions");

				await Session.update(
					{
						updatedAt: new Date()
					},
					{
						where: {
							sessionId: socket.getSessionId()
						}
					}
				);

				session = await Session.findByPk(socket.getSessionId());

				if (!session) throw new Error("Session not found.");
			}

			// Transform null to undefined, as JSON doesn't support undefined
			const payload = _payload === null ? undefined : _payload;
			await JobQueue.queueJob(Job, payload, {
				session,
				socketId: socket.getSocketId(),
				callbackRef
			});
		} catch (error) {
			const message = getErrorMessage(error);

			if (callbackRef)
				socket.dispatch("jobCallback", callbackRef, {
					status: "error",
					message
				});
			else socket.dispatch("error", message);
		}
	}

	/**
	 * getSockets - Get websocket clients
	 */
	public async getSockets() {
		return this._wsServer?.clients;
	}

	/**
	 * getSocket - Get websocket client
	 */
	public async getSocket(socketId?: string, sessionId?: Types.ObjectId) {
		if (!this._wsServer) return null;

		for (const clients of this._wsServer.clients.entries() as IterableIterator<
			[WebSocket, WebSocket]
		>) {
			const socket = clients.find(socket => {
				if (socket.getSocketId() === socketId) return true;
				if (socket.getSessionId() === sessionId) return true;
				return false;
			});

			if (socket) return socket;
		}

		return null;
	}

	/**
	 * dispatch - Dispatch message to socket
	 */
	public async dispatch(
		socketId: string,
		channel: string,
		...values: unknown[]
	) {
		const socket = await this.getSocket(socketId);

		if (!socket) return;

		socket.dispatch(channel, ...values);
	}

	/**
	 * shutdown - Shutdown websocket module
	 */
	public override async shutdown() {
		await super.shutdown();

		if (this._httpServer) this._httpServer.close();
		if (this._wsServer) this._wsServer.close();

		await this._stopped();
	}
}

export default new WebSocketModule();
