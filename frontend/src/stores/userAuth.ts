import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import Toast from "toasters";
import validation from "@/validation";
import { useWebsocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";
import Model from "@/Model";

export const useUserAuthStore = defineStore("userAuth", () => {
	const configStore = useConfigStore();
	const websocketStore = useWebsocketStore();

	const userIdMap = ref<Record<string, { name: string; username: string }>>(
		{}
	);
	const userIdRequested = ref<Record<string, boolean>>({});
	const pendingUserIdCallbacks = ref<
		Record<
			string,
			((basicUser: { name: string; username: string }) => void)[]
		>
	>({});
	const currentUser = ref<Model | null>();
	const banned = ref(false);
	const ban = ref<{
		reason?: string;
		expiresAt?: number;
	} | null>({
		reason: null,
		expiresAt: null
	});
	const gotData = ref(false);
	const gotPermissions = ref(false);
	const permissions = ref<Record<string, boolean>>({});
	const nightmode = ref(false);

	const loggedIn = computed(() => !!currentUser.value);

	const register = async (user: {
		username: string;
		email: string;
		password: string;
		recaptchaToken: string;
	}) => {
		const { username, email, password, recaptchaToken } = user;

		if (!email || !username || !password)
			throw new Error("Please fill in all fields");

		if (!validation.isLength(email, 3, 254))
			throw new Error("Email must have between 3 and 254 characters.");

		if (
			email.indexOf("@") !== email.lastIndexOf("@") ||
			!validation.regex.emailSimple.test(email)
		)
			throw new Error("Invalid email format.");

		if (!validation.isLength(username, 2, 32))
			throw new Error("Username must have between 2 and 32 characters.");

		if (!validation.regex.azAZ09_.test(username))
			throw new Error(
				"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
			);

		if (username.replaceAll(/[_]/g, "").length === 0)
			throw new Error(
				"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number."
			);

		if (!validation.isLength(password, 6, 200))
			throw new Error("Password must have between 6 and 200 characters.");

		if (!validation.regex.password.test(password))
			throw new Error(
				"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character."
			);

		const data = await websocketStore.runJob("users.register", {
			username,
			email,
			password,
			recaptchaToken
		});

		if (!data?.SID) throw new Error("You must login");

		const date = new Date();
		date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

		const secure = configStore.urls.secure ? "secure=true; " : "";

		let domain = "";
		if (configStore.urls.host !== "localhost")
			domain = ` domain=${configStore.urls.host};`;

		document.cookie = `${configStore.cookie}=${
			data.SID
		}; expires=${date.toUTCString()}; ${domain}${secure}path=/`;
	};

	const login = async (user: { email: string; password: string }) => {
		const { email, password } = user;

		const data = await websocketStore.runJob("users.login", {
			email,
			password
		});

		const date = new Date();
		date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

		const secure = configStore.urls.secure ? "secure=true; " : "";

		let domain = "";
		if (configStore.urls.host !== "localhost")
			domain = ` domain=${configStore.urls.host};`;

		document.cookie = `${configStore.cookie}=${
			data.SID
		}; expires=${date.toUTCString()}; ${domain}${secure}path=/`;

		const loginBroadcastChannel = new BroadcastChannel(
			`${configStore.cookie}.user_login`
		);
		loginBroadcastChannel.postMessage(true);
		loginBroadcastChannel.close();
	};

	const logout = async () => {
		await websocketStore.runJob("data.users.logout"); // TODO: Deal with socket closing before callback received
	};

	const mapUserId = (data: {
		userId: string;
		user: { name: string; username: string };
	}) => {
		userIdMap.value[`Z${data.userId}`] = data.user;
		userIdRequested.value[`Z${data.userId}`] = false;
	};

	const requestingUserId = (userId: string) => {
		userIdRequested.value[`Z${userId}`] = true;
		if (!pendingUserIdCallbacks.value[`Z${userId}`])
			pendingUserIdCallbacks.value[`Z${userId}`] = [];
	};

	const pendingUser = (
		userId: string,
		callback: (basicUser: { name: string; username: string }) => void
	) => {
		pendingUserIdCallbacks.value[`Z${userId}`].push(callback);
	};

	const clearPendingCallbacks = (userId: string) => {
		pendingUserIdCallbacks.value[`Z${userId}`] = [];
	};

	const getBasicUser = async (userId: string) =>
		new Promise((resolve, reject) => {
			if (typeof userIdMap.value[`Z${userId}`] === "string") {
				resolve(userIdMap.value[`Z${userId}`]);
				return;
			}

			if (userIdRequested.value[`Z${userId}`] === true) {
				pendingUser(userId, user => resolve(user));
				return;
			}

			requestingUserId(userId);

			// TODO use model store for this?
			websocketStore
				.runJob("data.users.findById", { _id: userId })
				.then(user => {
					mapUserId({
						userId,
						user
					});

					pendingUserIdCallbacks.value[`Z${userId}`].forEach(cb =>
						cb(user)
					);

					clearPendingCallbacks(userId);

					resolve(user);
				})
				.catch(reject);
		});

	const banUser = (data: { reason: string; expiresAt: number }) => {
		banned.value = true;
		ban.value = data;
	};

	const hasPermission = (permission: string) =>
		!!(permissions.value && permissions.value[permission]);

	const updatePermissions = () =>
		websocketStore
			.runJob("data.users.getPermissions", undefined)
			.then(data => {
				permissions.value = data;
				gotPermissions.value = true;
			});

	const resetCookieExpiration = () => {
		const cookies = {};
		document.cookie.split("; ").forEach(cookie => {
			cookies[cookie.substring(0, cookie.indexOf("="))] =
				cookie.substring(cookie.indexOf("=") + 1, cookie.length);
		});

		const SIDName = configStore.cookie;

		if (!cookies[SIDName]) return;

		const date = new Date();
		date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

		const secure = configStore.urls.secure ? "secure=true; " : "";

		let domain = "";
		if (configStore.urls.host !== "localhost")
			domain = ` domain=${configStore.urls.host};`;

		document.cookie = `${configStore.cookie}=${
			cookies[SIDName]
		}; expires=${date.toUTCString()}; ${domain}${secure}path=/`;
	};

	const toggleNightmode = async () => {
		if (loggedIn.value) {
			try {
				await websocketStore.runJob(`data.users.updateById`, {
					_id: currentUser.value._id,
					query: {
						nightmode: !nightmode.value
					}
				});
			} catch (error) {
				new Toast(error.message);
			}
		} else {
			nightmode.value = !nightmode.value;

			const nightmodeBroadcastChannel = new BroadcastChannel(
				`${configStore.cookie}.nightmode`
			);
			nightmodeBroadcastChannel.postMessage(nightmode.value);
			nightmodeBroadcastChannel.close();
		}
	};

	watch(
		currentUser,
		user => {
			if (!user) return;

			nightmode.value = user.nightmode;
		},
		{ deep: true }
	);

	return {
		userIdMap,
		userIdRequested,
		pendingUserIdCallbacks,
		currentUser,
		banned,
		ban,
		gotData,
		gotPermissions,
		permissions,
		nightmode,
		loggedIn,
		register,
		login,
		logout,
		mapUserId,
		requestingUserId,
		pendingUser,
		clearPendingCallbacks,
		getBasicUser,
		banUser,
		hasPermission,
		updatePermissions,
		resetCookieExpiration,
		toggleNightmode
	};
});
