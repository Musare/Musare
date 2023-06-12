import config from "config";
import { Types, isObjectIdOrHexString } from "mongoose";
import { IncomingMessage } from "node:http";
import JobContext from "../JobContext";
import BaseModule from "../BaseModule";
import { Jobs, Modules, UniqueMethods } from "../types/Modules";
import WebSocket from "../WebSocket";
import { UserRole } from "../schemas/user";
import { StationType } from "../schemas/station";
import permissions from "../permissions";

export default class APIModule extends BaseModule {
	private _subscriptions: Record<string, Set<string>>;

	/**
	 * API Module
	 */
	public constructor() {
		super("api");

		this.dependentModules = ["data", "events", "websocket"];
		this._subscriptions = {};
	}

	/**
	 * startup - Startup api module
	 */
	public override async startup() {
		await super.startup();

		await super.started();
	}

	/**
	 * shutdown - Shutdown api module
	 */
	public override async shutdown() {
		await super.shutdown();

		await this._removeAllSubscriptions();

		await super.stopped();
	}

	/**
	 * runJob - Run a job
	 */
	public async runJob<
		ModuleNameType extends keyof Jobs & keyof Modules,
		JobNameType extends keyof Jobs[ModuleNameType] &
			keyof Omit<Modules[ModuleNameType], keyof BaseModule>,
		PayloadType extends "payload" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["payload"] extends undefined
				? Record<string, never>
				: Jobs[ModuleNameType][JobNameType]["payload"]
			: Record<string, never>,
		ReturnType = "returns" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["returns"]
			: never
	>(
		context: JobContext,
		{
			moduleName,
			jobName,
			payload,
			sessionId,
			socketId
		}: {
			moduleName: ModuleNameType;
			jobName: JobNameType;
			payload: PayloadType;
			sessionId?: string;
			socketId?: string;
		}
	): Promise<ReturnType> {
		let session;
		if (sessionId) {
			const Session = await context.getModel("session");

			session = await Session.findByIdAndUpdate(sessionId, {
				updatedAt: Date.now()
			});
		}

		return context.executeJob(moduleName, jobName, payload, {
			session,
			socketId
		});
	}

	/**
	 * getCookieValueFromHeader - Get value of a cookie from cookie header string
	 */
	private _getCookieValueFromHeader(cookieName: string, header: string) {
		const cookie = header
			.split("; ")
			.find(
				cookie =>
					cookie.substring(0, cookie.indexOf("=")) === cookieName
			);

		return cookie?.substring(cookie.indexOf("=") + 1, cookie.length);
	}

	/**
	 * prepareWebsocket - Prepare websocket connection
	 */
	public async prepareWebsocket(
		context: JobContext,
		{ socket, request }: { socket: WebSocket; request: IncomingMessage }
	) {
		const socketId = request.headers["sec-websocket-key"];
		socket.setSocketId(socketId);

		let sessionId = request.headers.cookie
			? this._getCookieValueFromHeader(
					config.get<string>("cookie"),
					request.headers.cookie
			  )
			: undefined;

		if (sessionId && isObjectIdOrHexString(sessionId))
			socket.setSessionId(sessionId);
		else sessionId = undefined;

		let user;
		if (sessionId) {
			const Session = await context.getModel("session");

			const session = await Session.findByIdAndUpdate(sessionId, {
				updatedAt: Date.now()
			});

			if (session) {
				context.setSession(session);

				user = await context.getUser().catch(() => undefined);
			}
		}

		socket.on("close", async () => {
			if (socketId)
				await this.jobQueue.runJob("api", "unsubscribeAll", {
					socketId
				});
		});

		return {
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
			user: user
				? {
						loggedIn: true,
						role: user.role,
						username: user.username,
						email: user.email.address,
						userId: user._id
				  }
				: { loggedIn: false }
		};
	}

	public async getUserPermissions(
		context: JobContext,
		{ stationId }: { stationId?: Types.ObjectId }
	) {
		const user = await context.getUser();

		const roles: (UserRole | "owner" | "dj")[] = [user.role];

		if (stationId) {
			const Station = await context.getModel("station");

			const station = await Station.findById(stationId);

			if (!station) throw new Error("Station not found");

			if (
				station.type === StationType.COMMUNITY &&
				station.owner === user._id
			)
				roles.push("owner");
			else if (station.djs.find(dj => dj === user._id)) roles.push("dj");
		}

		let rolePermissions: Record<string, boolean> = {};
		roles.forEach(role => {
			if (permissions[role])
				rolePermissions = { ...rolePermissions, ...permissions[role] };
		});

		return rolePermissions;
	}

	private async _subscriptionCallback(channel: string, value?: any) {
		const promises = [];
		for await (const socketId of this._subscriptions[channel].values()) {
			promises.push(
				this.jobQueue.runJob("websocket", "dispatch", {
					socketId,
					channel,
					value
				})
			);
		}
		await Promise.all(promises);
	}

	public async subscribe(
		context: JobContext,
		payload: { channel: string; socketId?: string }
	) {
		// TODO: assert perm to join by socketId
		// TODO: Prevent socketId payload from outside backend

		const { channel } = payload;

		const socketId = payload.socketId ?? context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		if (!this._subscriptions[channel])
			this._subscriptions[channel] = new Set();

		if (this._subscriptions[channel].has(socketId)) return;

		this._subscriptions[channel].add(socketId);

		if (this._subscriptions[channel].size === 1)
			await context.executeJob("events", "subscribe", {
				type: "event",
				channel,
				callback: value => this._subscriptionCallback(channel, value)
			});
	}

	public async unsubscribe(
		context: JobContext,
		payload: { channel: string; socketId: string }
	) {
		const { channel } = payload;

		const socketId = payload.socketId ?? context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		if (
			!(
				this._subscriptions[channel] &&
				this._subscriptions[channel].has(socketId)
			)
		)
			return;

		this._subscriptions[channel].delete(socketId);

		if (this._subscriptions[channel].size === 0)
			await context.executeJob("events", "unsubscribe", {
				type: "event",
				channel,
				callback: value => this._subscriptionCallback(channel, value)
			});
	}

	public async unsubscribeAll(
		context: JobContext,
		payload: { socketId: string }
	) {
		const socketId = payload.socketId ?? context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await Promise.all(
			Object.entries(this._subscriptions)
				.filter(([, socketIds]) => socketIds.has(socketId))
				.map(([channel]) =>
					context.executeJob("api", "unsubscribe", {
						socketId,
						channel
					})
				)
		);
	}

	private async _removeAllSubscriptions() {
		await Promise.all(
			Object.entries(this._subscriptions).map(
				async ([channel, socketIds]) => {
					const promises = [];
					for await (const socketId of socketIds.values()) {
						promises.push(
							this.jobQueue.runJob("api", "unsubscribe", {
								socketId,
								channel
							})
						);
					}
					return Promise.all(promises);
				}
			)
		);
	}
}

export type APIModuleJobs = {
	[Property in keyof UniqueMethods<APIModule>]: {
		payload: Parameters<UniqueMethods<APIModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<APIModule>[Property]>>;
	};
};
