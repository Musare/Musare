<template>
	<div v-if="isUser">
		<metadata v-bind:title="`Profile | ${user.username}`" />
		<main-header />
		<div class="info-section">
			<div class="picture-name-row">
				<img
					class="profile-picture"
					:src="
						user.avatar
							? `${user.avatar}?d=${notes}&s=250`
							: '/assets/notes.png'
					"
					onerror="this.src='/assets/notes.png'; this.onerror=''"
				/>
				<div>
					<div class="name-role-row">
						<p class="name">{{ user.name }}</p>
						<span class="role admin" v-if="user.role === 'admin'"
							>admin</span
						>
					</div>
					<p class="username">@{{ user.username }}</p>
				</div>
			</div>
			<div class="buttons" v-if="userId === user._id || role === 'admin'">
				<router-link
					:to="`/admin/users?userId=${user._id}`"
					class="button is-primary"
					v-if="role === 'admin'"
				>
					Edit
				</router-link>
				<router-link
					to="/settings"
					class="button is-primary"
					v-if="userId === user._id"
				>
					Settings
				</router-link>
			</div>
			<div class="bio-row" v-if="user.bio">
				<i class="material-icons">notes</i>
				<p>{{ user.bio }}</p>
			</div>
			<div
				class="date-location-row"
				v-if="user.createdAt || user.location"
			>
				<div class="date" v-if="user.createdAt">
					<i class="material-icons">calendar_today</i>
					<p>{{ user.createdAt }}</p>
				</div>
				<div class="location" v-if="user.location">
					<i class="material-icons">location_on</i>
					<p>{{ user.location }}</p>
				</div>
			</div>
		</div>
		<div class="bottom-section">
			<div class="buttons">
				<button class="active">Recent activity</button>
				<button>Playlists</button>
			</div>
			<div class="content">
				Content here
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState } from "vuex";
import { format, parseISO } from "date-fns";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";
import io from "../../io";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			user: {},
			notes: "",
			isUser: false
		};
	},
	computed: mapState({
		role: state => state.user.auth.role,
		userId: state => state.user.auth.userId
	}),
	mounted() {
		lofig.get("frontendDomain").then(frontendDomain => {
			this.frontendDomain = frontendDomain;
			this.notes = encodeURI(`${this.frontendDomain}/assets/notes.png`);
		});

		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit(
				"users.findByUsername",
				this.$route.params.username,
				res => {
					if (res.status === "error") this.$router.go("/404");
					else {
						this.user = res.data;
						this.user.createdAt = format(
							parseISO(this.user.createdAt),
							"MMMM do yyyy"
						);
						this.isUser = true;
					}
				}
			);
		});
	},
	methods: {}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.info-section {
	width: 912px;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;

	.picture-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		column-gap: 32px;
		justify-content: center;
		margin-bottom: 24px;
	}

	.profile-picture {
		width: 100px;
		height: 100px;
		border-radius: 100%;
	}

	.name-role-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		column-gap: 12px;
	}

	.name {
		font-size: 34px;
		line-height: 40px;
		color: $dark-grey-3;
	}

	.role {
		padding: 2px 24px;
		color: $white;
		text-transform: uppercase;
		font-size: 12px;
		line-height: 14px;
		height: 18px;
		border-radius: 5px;

		&.admin {
			background-color: $red;
		}
	}

	.username {
		font-size: 24px;
		line-height: 28px;
		color: $dark-grey;
	}

	.buttons {
		width: 388px;
		display: flex;
		flex-direction: row;
		column-gap: 20px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;

		.button {
			flex: 1;
			font-size: 17px;
			line-height: 20px;
		}
	}

	.bio-row,
	.date-location-row {
		i {
			font-size: 24px;
			color: $dark-grey-2;
			margin-right: 12px;
		}

		p {
			font-size: 17px;
			line-height: 20px;
			color: $dark-grey-2;
			word-break: break-word;
		}
	}

	.bio-row {
		max-width: 608px;
		margin-bottom: 24px;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		width: max-content;
	}

	.date-location-row {
		max-width: 608px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;
		display: flex;
		width: max-content;
		margin-bottom: 24px;
		column-gap: 48px;
	}

	.date,
	.location {
		display: flex;
	}
}

.bottom-section {
	width: 960px;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;
	display: flex;
	column-gap: 64px;

	.buttons {
		height: 100%;
		width: 251px;

		button {
			outline: none;
			border: none;
			box-shadow: none;
			color: $musareBlue;
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: 5px;
			background-color: transparent;

			&.active {
				color: $white;
				background-color: $musareBlue;
			}
		}
	}

	.content {
		outline: 1px solid black;
		width: 597px;
	}
}

.night-mode {
	.name,
	.username,
	.bio-row i,
	.bio-row p,
	.date-location-row i,
	.date-location-row p {
		color: $light-grey;
	}
}
</style>
