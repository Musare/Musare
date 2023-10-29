import config from "config";
import express from "express";
import http, { Server, IncomingMessage } from "node:http";
import { RawData, WebSocketServer } from "ws";
import { Types } from "mongoose";
import BaseModule from "@/BaseModule";
import { UniqueMethods } from "@/types/Modules";
import WebSocket from "@/WebSocket";
import JobContext from "@/JobContext";
import Job from "@/Job";
import ModuleManager from "@/ModuleManager";
import JobQueue from "@/JobQueue";

export class WebSocketModule extends BaseModule {
	private _httpServer?: Server;

	private _wsServer?: WebSocketServer;

	private _keepAliveInterval?: NodeJS.Timer;

	/**
	 * WebSocket Module
	 */
	public constructor() {
		super("websocket");

		this._jobConfigDefault = false;

		this._jobConfig = {
			getSocket: "disabled",
			getSockets: "disabled"
		};
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

		await super._started();
	}

	/**
	 * keepAlive - Ping open clients and terminate closed
	 */
	private async _keepAlive() {
		if (!this._wsServer) return;

		for await (const clients of this._wsServer.clients.entries()) {
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
	private async _handleConnection(
		socket: WebSocket,
		request: IncomingMessage
	) {
		if (JobQueue.getStatus().isPaused) {
			socket.close();
			return;
		}

		const readyData = await new Job("prepareWebsocket", "api", {
			socket,
			request
		}).execute();

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
			socket.log({
				type: "debug",
				message: `WebSocket closed #${socket.getSocketId()}`
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

			const [moduleJob, payload, options] = data;
			const [moduleName, ...jobNameParts] = moduleJob.split(".");
			const jobName = jobNameParts.join(".");

			const { callbackRef } = options ?? payload ?? {};

			if (!callbackRef)
				throw new Error(
					`No callback reference provided for job ${moduleJob}`
				);

			const module = ModuleManager.getModule(moduleName);
			if (!module) throw new Error(`Module "${moduleName}" not found`);

			const job = module.getJob(jobName);
			if (!job.api) throw new Error(`Job "${jobName}" not found.`);

			const res = await JobQueue.runJob("api", "runJob", {
				moduleName,
				jobName,
				payload,
				sessionId: socket.getSessionId(),
				socketId: socket.getSocketId()
			});

			socket.dispatch("jobCallback", callbackRef, {
				status: "success",
				data: res
			});
		} catch (error) {
			const message = error?.message ?? error;

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
		context: JobContext,
		{
			socketId,
			channel,
			value
		}: { socketId: string; channel: string; value?: any }
	) {
		const socket = await this.getSocket(socketId);

		if (!socket) return;

		const values = Array.isArray(value) ? value : [value];

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

export type WebSocketModuleJobs = {
	[Property in keyof UniqueMethods<WebSocketModule>]: {
		payload: Parameters<UniqueMethods<WebSocketModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<WebSocketModule>[Property]>>;
	};
};

export default new WebSocketModule();
