<template>
	<div class="station-settings">
		<label class="label">Change Station Name</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input class="input" type="text" v-model="station.name" />
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="saveChanges()"
					>Save</a
				>
			</p>
		</div>
		<label class="label">Change Station Display Name</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					v-model="station.displayName"
				/>
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="saveChanges()"
					>Save</a
				>
			</p>
		</div>
		<label class="label">Change Description</label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					v-model="station.description"
				/>
			</p>
			<p class="control">
				<a class="button is-info" @click.prevent="saveChanges()"
					>Save</a
				>
			</p>
		</div>
		<div class="settings-buttons">
			<div class="small-section">
				<label class="label">Theme</label>
				<tippy
					class="button-wrapper"
					theme="addToPlaylist"
					interactive="true"
					placement="bottom"
					trigger="click"
					append-to="parent"
				>
					<template #trigger>
						<button :class="station.theme">
							<i class="material-icons">palette</i>
							{{ station.theme }}
						</button>
					</template>
					<button
						class="blue"
						v-if="station.theme !== 'blue'"
						@click="updateThemeLocal('blue')"
					>
						<i class="material-icons">palette</i>
						Blue
					</button>
					<button
						class="purple"
						v-if="station.theme !== 'purple'"
						@click="updateThemeLocal('purple')"
					>
						<i class="material-icons">palette</i>
						Purple
					</button>
					<button
						class="teal"
						v-if="station.theme !== 'teal'"
						@click="updateThemeLocal('teal')"
					>
						<i class="material-icons">palette</i>
						Teal
					</button>
					<button
						class="orange"
						v-if="station.theme !== 'orange'"
						@click="updateThemeLocal('orange')"
					>
						<i class="material-icons">palette</i>
						Orange
					</button>
				</tippy>
			</div>
			<div class="small-section">
				<label class="label">Privacy</label>
				<tippy
					class="button-wrapper"
					theme="addToPlaylist"
					interactive="true"
					placement="bottom"
					trigger="click"
					append-to="parent"
				>
					<template #trigger>
						<button :class="privacyButtons[station.privacy].style">
							<i class="material-icons">{{
								privacyButtons[station.privacy].iconName
							}}</i>
							{{ station.privacy }}
						</button>
					</template>
					<button
						class="green"
						v-if="station.privacy !== 'public'"
						@click="updatePrivacyLocal('public')"
					>
						<i class="material-icons">{{
							privacyButtons["public"].iconName
						}}</i>
						Public
					</button>
					<button
						class="orange"
						v-if="station.privacy !== 'unlisted'"
						@click="updatePrivacyLocal('unlisted')"
					>
						<i class="material-icons">{{
							privacyButtons["unlisted"].iconName
						}}</i>
						Unlisted
					</button>
					<button
						class="red"
						v-if="station.privacy !== 'private'"
						@click="updatePrivacyLocal('private')"
					>
						<i class="material-icons">{{
							privacyButtons["private"].iconName
						}}</i>
						Private
					</button>
				</tippy>
			</div>
			<div class="small-section">
				<label class="label">Station Mode</label>
				<tippy
					class="button-wrapper"
					theme="addToPlaylist"
					interactive="true"
					placement="bottom"
					trigger="click"
					append-to="parent"
				>
					<template #trigger>
						<button
							:class="{
								blue: !station.partyMode,
								yellow: station.partyMode
							}"
						>
							<i class="material-icons">{{
								station.partyMode
									? "emoji_people"
									: "playlist_play"
							}}</i>
							{{ station.partyMode ? "Party" : "Playlist" }}
						</button>
					</template>
					<button
						class="blue"
						v-if="station.partyMode"
						@click="updatePartyModeLocal(false)"
					>
						<i class="material-icons">playlist_play</i>
						Playlist
					</button>
					<button
						class="yellow"
						v-if="!station.partyMode"
						@click="updatePartyModeLocal(true)"
					>
						<i class="material-icons">emoji_people</i>
						Party
					</button>
				</tippy>
			</div>
			<div v-if="!station.partyMode" class="small-section">
				<label class="label">Play Mode</label>
				<tippy
					class="button-wrapper"
					theme="addToPlaylist"
					interactive="true"
					placement="bottom"
					trigger="click"
					append-to="parent"
				>
					<template #trigger>
						<button class="blue">
							<i class="material-icons">{{
								station.playMode === "random"
									? "shuffle"
									: "format_list_numbered"
							}}</i>
							{{
								station.playMode === "random"
									? "Random"
									: "Sequential"
							}}
						</button>
					</template>
					<button
						class="blue"
						v-if="station.playMode === 'sequential'"
						@click="updatePlayModeLocal('random')"
					>
						<i class="material-icons">shuffle</i>
						Random
					</button>
					<button
						class="blue"
						v-if="station.playMode === 'random'"
						@click="updatePlayModeLocal('sequential')"
					>
						<i class="material-icons">format_list_numbered</i>
						Sequential
					</button>
				</tippy>
			</div>
			<div
				v-if="
					station.type === 'community' && station.partyMode === true
				"
				class="small-section"
			>
				<label class="label">Queue lock</label>
				<div class="button-wrapper">
					<button
						:class="{
							green: station.locked,
							red: !station.locked
						}"
						@click="
							station.locked
								? updateQueueLockLocal(true)
								: updateQueueLockLocal(false)
						"
					>
						<i class="material-icons">{{
							station.locked ? "lock" : "lock_open"
						}}</i>
						{{ station.locked ? "Locked" : "Unlocked" }}
					</button>
					<transition name="slide-down">
						<button
							class="green"
							v-if="!station.locked"
							@click="updateQueueLockLocal(true)"
						>
							<i class="material-icons">lock</i>
							Locked
						</button>
					</transition>
					<transition name="slide-down">
						<button
							class="red"
							v-if="station.locked"
							@click="updateQueueLockLocal(false)"
						>
							<i class="material-icons">lock_open</i>
							Unlocked
						</button>
					</transition>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

export default {
	data() {
		return {
			privacyButtons: {
				public: {
					style: "green",
					iconName: "public"
				},
				private: {
					style: "red",
					iconName: "lock"
				},
				unlisted: {
					style: "orange",
					iconName: "link"
				}
			}
		};
	},
	computed: {
		...mapState({
			station: state => state.station.station,
			originalStation: state => state.originalStation
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		updateThemeLocal() {},
		updatePrivacyLocal() {},
		updatePartyModeLocal() {},
		updatePlayModeLocal() {},
		updateQueueLockLocal() {}
	}
};
</script>

<style lang="scss" scoped>
.station-settings {
	.settings-buttons {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		.small-section {
			width: calc(50% - 10px);
			min-width: 150px;
			margin: 5px auto;
		}
	}
	.button-wrapper {
		display: flex;
		flex-direction: column;

		button {
			width: 100%;
			height: 36px;
			border: 0;
			border-radius: 3px;
			font-size: 18px;
			color: var(--white);
			box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.25);
			display: block;
			text-align: center;
			justify-content: center;
			display: inline-flex;
			-ms-flex-align: center;
			align-items: center;
			-moz-user-select: none;
			user-select: none;
			cursor: pointer;
			padding: 0;
			text-transform: capitalize;

			&.red {
				background-color: var(--red);
			}

			&.green {
				background-color: var(--green);
			}

			&.blue {
				background-color: var(--blue);
			}

			&.orange {
				background-color: var(--orange);
			}

			&.yellow {
				background-color: var(--yellow);
			}

			&.purple {
				background-color: var(--purple);
			}

			&.teal {
				background-color: var(--teal);
			}

			i {
				font-size: 20px;
				margin-right: 4px;
			}
		}
	}
}
</style>
