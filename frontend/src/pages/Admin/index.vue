<template>
	<div class="app">
		<div class="admin-area">
			<main-header :class="{ 'admin-sidebar-active': sidebarActive }" />
			<div class="admin-content">
				<div
					class="admin-sidebar"
					:class="{ minimised: !sidebarActive }"
				>
					<div class="inner">
						<div
							class="bottom"
							:style="`padding-bottom: ${sidebarPadding}px`"
						>
							<div
								class="sidebar-item toggle-sidebar"
								@click="toggleSidebar()"
								content="Expand"
								v-tippy="{ onShow: () => !sidebarActive }"
							>
								<i class="material-icons">menu_open</i>
								<span>Minimise</span>
							</div>
							<div
								v-if="sidebarActive"
								class="sidebar-item with-children"
								:class="{ 'is-active': childrenActive.songs }"
							>
								<span>
									<router-link to="/admin/songs">
										<i class="material-icons">music_note</i>
										<span>Songs</span>
									</router-link>
									<i
										class="material-icons toggle-sidebar-children"
										@click="
											toggleChildren({ child: 'songs' })
										"
									>
										{{
											childrenActive.songs
												? "expand_less"
												: "expand_more"
										}}
									</i>
								</span>
								<div class="sidebar-item-children">
									<router-link
										class="sidebar-item-child"
										to="/admin/songs"
									>
										Songs
									</router-link>
									<router-link
										class="sidebar-item-child"
										to="/admin/songs/import"
									>
										Import
									</router-link>
								</div>
							</div>
							<router-link
								v-else
								class="sidebar-item songs"
								to="/admin/songs"
								content="Songs"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">music_note</i>
								<span>Songs</span>
							</router-link>
							<router-link
								class="sidebar-item reports"
								to="/admin/reports"
								content="Reports"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">flag</i>
								<span>Reports</span>
							</router-link>
							<router-link
								class="sidebar-item stations"
								to="/admin/stations"
								content="Stations"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">radio</i>
								<span>Stations</span>
							</router-link>
							<router-link
								class="sidebar-item playlists"
								to="/admin/playlists"
								content="Playlists"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">library_music</i>
								<span>Playlists</span>
							</router-link>
							<div
								v-if="sidebarActive"
								class="sidebar-item with-children"
								:class="{ 'is-active': childrenActive.users }"
							>
								<span>
									<router-link to="/admin/users">
										<i class="material-icons">people</i>
										<span>Users</span>
									</router-link>
									<i
										class="material-icons toggle-sidebar-children"
										@click="
											toggleChildren({ child: 'users' })
										"
									>
										{{
											childrenActive.users
												? "expand_less"
												: "expand_more"
										}}
									</i>
								</span>
								<div class="sidebar-item-children">
									<router-link
										class="sidebar-item-child"
										to="/admin/users"
									>
										Users
									</router-link>
									<router-link
										class="sidebar-item-child"
										to="/admin/users/data-requests"
									>
										Data Requests
									</router-link>
								</div>
							</div>
							<router-link
								v-else
								class="sidebar-item users"
								to="/admin/users"
								content="Users"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">people</i>
								<span>Users</span>
							</router-link>
							<router-link
								class="sidebar-item punishments"
								to="/admin/punishments"
								content="Punishments"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">gavel</i>
								<span>Punishments</span>
							</router-link>
							<router-link
								class="sidebar-item news"
								to="/admin/news"
								content="News"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">chrome_reader_mode</i>
								<span>News</span>
							</router-link>
							<router-link
								class="sidebar-item statistics"
								to="/admin/statistics"
								content="Statistics"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">show_chart</i>
								<span>Statistics</span>
							</router-link>
							<router-link
								class="sidebar-item youtube"
								to="/admin/youtube"
								content="YouTube"
								v-tippy="{
									theme: 'info',
									onShow: () => !sidebarActive
								}"
							>
								<i class="material-icons">circle</i>
								<span>YouTube</span>
							</router-link>
						</div>
					</div>
				</div>
				<div class="admin-container">
					<div class="admin-tab-container">
						<router-view></router-view>
					</div>

					<main-footer />
				</div>
			</div>
		</div>

		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div>
						<span class="biggest"
							><b>Keyboard shortcuts helper</b></span
						>
						<span
							><b>Ctrl + /</b> - Toggles this keyboard shortcuts
							helper</span
						>
						<span
							><b>Ctrl + Shift + /</b> - Resets the position of
							this keyboard shortcuts helper</span
						>
						<hr />
					</div>
					<div>
						<span class="biggest"><b>Table</b></span>
						<span class="bigger"><b>Navigation</b></span>
						<span
							><b>Up / Down arrow keys</b> - Move between
							rows</span
						>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Page navigation</b></span>
						<span
							><b>Ctrl + Left/Right arrow keys</b> - Previous/next
							page</span
						>
						<span
							><b>Ctrl + Shift + Left/Right arrow keys</b> -
							First/last page</span
						>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Reset localStorage</b></span>
						<span><b>Ctrl + F5</b> - Resets localStorage</span>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Selecting</b></span>
						<span><b>Space</b> - Selects/unselects a row</span>
						<span><b>Ctrl + A</b> - Selects all rows</span>
						<span
							><b>Shift + Up/Down arrow keys</b> - Selects all
							rows in between</span
						>
						<span
							><b>Ctrl + Up/Down arrow keys</b> - Unselects all
							rows in between</span
						>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Popup actions</b></span>
						<span><b>Ctrl + 1-9</b> - Execute action 1-9</span>
						<span><b>Ctrl + 0</b> - Select action 1</span>
						<hr />
					</div>
				</div>
			</template>
		</floating-box>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";

import keyboardShortcuts from "@/keyboardShortcuts";

import FloatingBox from "@/components/FloatingBox.vue";

export default {
	components: {
		FloatingBox
	},
	data() {
		return {
			currentTab: "",
			siteSettings: {
				logo: "",
				sitename: ""
			},
			sidebarActive: true,
			sidebarPadding: 0
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		...mapState("admin", { childrenActive: state => state.childrenActive })
	},
	watch: {
		$route(route) {
			if (this.getTabFromPath(route.path)) this.onRouteChange();
		}
	},
	async mounted() {
		if (this.getTabFromPath()) {
			this.onRouteChange();
		} else if (localStorage.getItem("lastAdminPage")) {
			this.$router.push(
				`/admin/${localStorage.getItem("lastAdminPage")}`
			);
		} else {
			this.$router.push(`/admin/songs`);
		}

		this.siteSettings = await lofig.get("siteSettings");

		this.sidebarActive = JSON.parse(
			localStorage.getItem("admin-sidebar-active")
		);
		if (this.sidebarActive === null)
			this.sidebarActive = !(document.body.clientWidth <= 768);

		this.calculateSidebarPadding();
		window.addEventListener("scroll", this.calculateSidebarPadding);

		keyboardShortcuts.registerShortcut(
			"admin.toggleKeyboardShortcutsHelper",
			{
				keyCode: 191, // '/' key
				ctrl: true,
				preventDefault: true,
				handler: () => {
					this.toggleKeyboardShortcutsHelper();
				}
			}
		);

		keyboardShortcuts.registerShortcut(
			"admin.resetKeyboardShortcutsHelper",
			{
				keyCode: 191, // '/' key
				ctrl: true,
				shift: true,
				preventDefault: true,
				handler: () => {
					this.resetKeyboardShortcutsHelper();
				}
			}
		);
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRooms");

		window.removeEventListener("scroll", this.calculateSidebarPadding);

		const shortcutNames = [
			"admin.toggleKeyboardShortcutsHelper",
			"admin.resetKeyboardShortcutsHelper"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		onRouteChange() {
			if (this.currentTab.startsWith("songs")) {
				this.toggleChildren({ child: "songs", force: false });
			} else if (this.currentTab.startsWith("users")) {
				this.toggleChildren({ child: "users", force: false });
			}
			this.currentTab = this.getTabFromPath();
			if (this.$refs[`${this.currentTab}-tab`])
				this.$refs[`${this.currentTab}-tab`].scrollIntoView({
					inline: "center",
					block: "nearest"
				});
			localStorage.setItem("lastAdminPage", this.currentTab);
			if (this.currentTab.startsWith("songs"))
				this.toggleChildren({ child: "songs", force: true });
			else if (this.currentTab.startsWith("users"))
				this.toggleChildren({ child: "users", force: true });
		},
		toggleKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.toggleBox();
		},
		resetKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.resetBox();
		},
		toggleSidebar() {
			this.sidebarActive = !this.sidebarActive;
			localStorage.setItem("admin-sidebar-active", this.sidebarActive);
		},
		getTabFromPath(path) {
			const localPath = path || this.$route.path;
			return localPath.substr(0, 7) === "/admin/"
				? localPath.substr(7, localPath.length)
				: null;
		},
		calculateSidebarPadding() {
			const scrollTop =
				document.documentElement.scrollTop || document.scrollTop || 0;
			if (scrollTop <= 64) this.sidebarPadding = 64 - scrollTop;
			else this.sidebarPadding = 0;
		},
		...mapActions("admin", ["toggleChildren"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.main-container .admin-area {
		.admin-sidebar .inner {
			.top {
				background-color: var(--dark-grey-3);
			}

			.bottom {
				background-color: var(--dark-grey-2);

				.sidebar-item {
					background-color: var(--dark-grey-2);
					border-color: var(--dark-grey-3);

					&,
					&.with-children .sidebar-item-child,
					&.with-children > span > a {
						color: var(--white);
					}
				}
			}
		}

		:deep(.admin-content .admin-container .admin-tab-container) {
			.admin-tab {
				.card {
					background-color: var(--dark-grey-3);

					p {
						color: var(--light-grey-2);
					}
				}
			}
		}
	}
}

.main-container {
	height: auto;

	.admin-area {
		display: flex;
		flex-direction: column;
		min-height: 100vh;

		:deep(.nav) {
			.nav-menu.is-active {
				left: 45px;
			}
			&.admin-sidebar-active .nav-menu.is-active {
				left: 200px;
			}
		}

		.admin-sidebar {
			display: flex;
			min-width: 200px;
			width: 200px;

			@media screen and (max-width: 768px) {
				min-width: 45px;
				width: 45px;
			}

			.inner {
				display: flex;
				flex-direction: column;
				max-height: 100vh;
				width: 200px;
				position: sticky;
				top: 0;
				bottom: 0;
				left: 0;
				z-index: 5;
				box-shadow: @box-shadow;

				.bottom {
					overflow-y: auto;
					height: 100%;
					max-height: 100%;
					display: flex;
					flex-direction: column;
					flex: 1 0 auto;
					background-color: var(--white);

					.sidebar-item {
						display: flex;
						padding: 0 20px;
						line-height: 40px;
						font-size: 16px;
						font-weight: 600;
						color: var(--primary-color);
						background-color: var(--white);
						border-bottom: 1px solid var(--light-grey-2);
						transition: filter 0.2s ease-in-out;

						& > .material-icons {
							line-height: 40px;
							margin-right: 5px;
						}

						&:hover,
						&:focus,
						&.router-link-active,
						&.is-active {
							filter: brightness(95%);
						}

						&.toggle-sidebar {
							cursor: pointer;
							font-weight: 400;
						}

						&.with-children {
							flex-direction: column;
							& > span {
								display: flex;
								line-height: 40px;
								cursor: pointer;

								& > a {
									display: flex;
								}

								& > .material-icons,
								& > a > .material-icons {
									line-height: 40px;
									margin-right: 5px;
								}
							}

							.toggle-sidebar-children {
								margin-left: auto;
							}

							.sidebar-item-children {
								display: none;
							}

							&.is-active .sidebar-item-children {
								display: flex;
								flex-direction: column;

								.sidebar-item-child {
									display: flex;
									flex-direction: column;
									margin-left: 30px;
									font-size: 14px;
									line-height: 30px;
									position: relative;

									&::before {
										content: "";
										position: absolute;
										width: 1px;
										height: 30px;
										top: 0;
										left: -20px;
										background-color: var(--light-grey-3);
									}
									&:last-child::before {
										height: 16px;
									}

									&::after {
										content: "";
										position: absolute;
										width: 15px;
										height: 1px;
										top: 15px;
										left: -20px;
										background-color: var(--light-grey-3);
									}

									&.router-link-active {
										filter: brightness(95%);
									}
								}
							}
						}
					}
				}
			}

			&.minimised {
				min-width: 45px;
				width: 45px;

				.inner {
					max-width: 45px;

					.top {
						justify-content: center;

						.full-logo {
							display: none;
						}

						.minimised-logo {
							display: flex;
						}
					}

					.sidebar-item {
						justify-content: center;
						padding: 0;

						& > span {
							display: none;
						}
					}
				}
			}
		}

		.admin-content {
			display: flex;
			flex-direction: row;
			flex-grow: 1;

			.admin-container {
				display: flex;
				flex-direction: column;
				flex-grow: 1;
				overflow: hidden;

				:deep(.admin-tab-container) {
					display: flex;
					flex-direction: column;
					flex: 1 0 auto;
					padding: 10px 10px 20px 10px;

					.admin-tab {
						display: flex;
						flex-direction: column;
						width: 100%;
						max-width: 1900px;
						margin: 0 auto;
						padding: 0 10px;

						.card {
							display: flex;
							flex-grow: 1;
							flex-direction: column;
							padding: 20px;
							margin: 10px 0;
							border-radius: @border-radius;
							background-color: var(--white);
							color: var(--dark-grey);
							box-shadow: @box-shadow;

							h1 {
								font-size: 36px;
								margin: 0 0 5px 0;
							}

							h4 {
								font-size: 22px;
								margin: 0;
							}

							hr {
								margin: 10px 0;
							}

							&.tab-info {
								flex-direction: row;
								flex-wrap: wrap;

								.info-row {
									display: flex;
									flex-grow: 1;
									flex-direction: column;
								}

								.button-row {
									display: flex;
									flex-direction: row;
									flex-wrap: wrap;
									justify-content: center;
									margin: auto 0;
									padding: 5px 0;

									& > .button,
									& > span {
										margin: auto 0;
										&:not(:first-child) {
											margin-left: 5px;
										}
									}

									& > span > .control.has-addons {
										margin-bottom: 0 !important;
									}
								}
							}
						}

						@media screen and (min-width: 980px) {
							&.container {
								margin: 0 auto;
								max-width: 960px;
							}
						}

						@media screen and (min-width: 1180px) {
							&.container {
								max-width: 1200px;
							}
						}
					}
				}
			}
		}
	}
}

:deep(.box) {
	box-shadow: @box-shadow;
	display: block;

	&:not(:last-child) {
		margin-bottom: 20px;
	}
}

#keyboardShortcutsHelper {
	.box-body {
		.biggest {
			font-size: 18px;
		}

		.bigger {
			font-size: 16px;
		}

		span {
			display: block;
		}
	}
}
</style>
