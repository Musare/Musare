import config from "config";
import express from "express";
import http, { Server, IncomingMessage } from "node:http";
import { RawData, WebSocketServer } from "ws";
import { Types } from "mongoose";
import BaseModule from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import WebSocket from "../WebSocket";
import JobContext from "../JobContext";
import Job from "../Job";

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

		let callbackRef;

		try {
			const data = JSON.parse(message.toString());

			if (!Array.isArray(data) || data.length < 1)
				throw new Error("Invalid request");

			const [moduleJob, payload, options] = data;
			const [moduleName, ...jobNameParts] = moduleJob.split(".");
			const jobName = jobNameParts.join(".");

			callbackRef = (options ?? payload ?? {}).CB_REF;

			if (!callbackRef)
				throw new Error(
					`No callback reference provided for job ${moduleJob}`
				);

			const res = await this.jobQueue.runJob("api", "runJob", {
				moduleName,
				jobName,
				payload,
				sessionId: socket.getSessionId(),
				socketId: socket.getSocketId()
			});

			socket.dispatch("CB_REF", callbackRef, {
				status: "success",
				data: res
			});
		} catch (error) {
			const message = error?.message ?? error;

			socket.log({ type: "error", message });

			if (callbackRef)
				socket.dispatch("CB_REF", callbackRef, {
					status: "error",
					message
				});
			else socket.dispatch("ERROR", message);
		}
	}

	/**
	 * getSockets - Get websocket clients
	 */
	public async getSockets(context: JobContext) {
		return this.wsServer?.clients;
	}

	/**
	 * getSocket - Get websocket client
	 */
	public async getSocket(
		context: JobContext,
		{
			socketId,
			sessionId
		}: { socketId?: string; sessionId?: Types.ObjectId }
	) {
		if (!this.wsServer) return null;

		for (const clients of this.wsServer.clients.entries() as IterableIterator<
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
		const socket = await context.executeJob("websocket", "getSocket", {
			socketId
		});

		if (!socket) return;

		socket.dispatch(channel, value);
	}

	/**
	 * shutdown - Shutdown websocket module
	 */
	public override async shutdown() {
		await super.shutdown();

		if (this.httpServer) this.httpServer.close();
		if (this.wsServer) this.wsServer.close();

		await this.stopped();
	}
}

export type WebSocketModuleJobs = {
	[Property in keyof UniqueMethods<WebSocketModule>]: {
		payload: Parameters<UniqueMethods<WebSocketModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<WebSocketModule>[Property]>>;
	};
};
