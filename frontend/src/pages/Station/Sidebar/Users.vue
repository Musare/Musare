<template>
	<div id="users">
		<h5 class="has-text-centered">Total users: {{ userCount }}</h5>

		<transition-group name="notification-box">
			<h6
				class="has-text-centered"
				v-if="
					users.loggedIn &&
					users.loggedOut &&
					((users.loggedIn.length === 1 &&
						users.loggedOut.length === 0) ||
						(users.loggedIn.length === 0 &&
							users.loggedOut.length === 1))
				"
				key="only-me"
			>
				It's just you in the station!
			</h6>
			<h6
				class="has-text-centered"
				v-else-if="
					users.loggedIn &&
					users.loggedOut &&
					users.loggedOut.length > 0
				"
				key="logged-out-users"
			>
				{{ users.loggedOut.length }}
				{{ users.loggedOut.length > 1 ? "users are" : "user is" }}
				logged-out.
			</h6>
		</transition-group>

		<aside class="menu">
			<ul class="menu-list scrollable-list">
				<li v-for="user in users.loggedIn" :key="user.username">
					<router-link
						:to="{
							name: 'profile',
							params: { username: user.username }
						}"
						target="_blank"
					>
						<profile-picture
							:avatar="user.avatar"
							:name="user.name || user.username"
						/>

						{{ user.name || user.username }}
					</router-link>
				</li>
			</ul>
		</aside>

		<button
			class="button is-primary tab-actionable-button"
			@click="copyToClipboard()"
		>
			<i class="material-icons icon-with-button">share</i>
			<span> Share (copy to clipboard) </span>
		</button>
	</div>
</template>

<script>
import { mapState } from "vuex";
import Toast from "toasters";

import ProfilePicture from "@/components/ProfilePicture.vue";

export default {
	components: { ProfilePicture },
	data() {
		return {
			notesUri: "",
			frontendDomain: ""
		};
	},
	computed: mapState({
		users: state => state.station.users,
		userCount: state => state.station.userCount
	}),
	async mounted() {
		this.frontendDomain = await lofig.get("frontendDomain");
		this.notesUri = encodeURI(`${this.frontendDomain}/assets/notes.png`);
	},
	methods: {
		async copyToClipboard() {
			try {
				await navigator.clipboard.writeText(
					this.frontendDomain + this.$route.fullPath
				);
			} catch (err) {
				new Toast("Failed to copy to clipboard.");
			}
		}
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	#users {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}

	a {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;

		&:hover {
			color: var(--light-grey) !important;
		}
	}
}

.notification-box-enter-active,
.fade-leave-active {
	transition: opacity 0.5s;
}
.notification-box-enter,
.notification-box-leave-to {
	opacity: 0;
}

#users {
	background-color: var(--white);
	margin-bottom: 20px;
	border-radius: 0 0 @border-radius @border-radius;
	max-height: 100%;

	.menu {
		padding: 0 10px;
		margin-top: 20px;
		width: 100%;
		overflow: auto;
		height: calc(100% - 20px - 40px);

		.menu-list {
			padding: 0 10px;
			margin-left: 0;
		}

		li {
			&:not(:first-of-type) {
				margin-top: 10px;
			}

			a {
				display: flex;
				align-items: center;
				padding: 5px 10px;
				border: 0.5px var(--light-grey-3) solid;
				border-radius: @border-radius;
				cursor: pointer;

				&:hover {
					background-color: var(--light-grey);
					color: var(--black);
				}

				.profile-picture {
					margin-right: 10px;
					width: 35px;
					height: 35px;
				}

				:deep(.profile-picture.using-initials span) {
					font-size: calc(
						35px / 5 * 2
					); // 2/5th of .profile-picture height/width
				}
			}
		}
	}

	h5 {
		font-size: 20px;
		margin-top: 20px;
	}
}
</style>
