<template>
	<div id="users">
		<h5 class="has-text-centered">Total users: {{ userCount }}</h5>
		<aside class="menu">
			<ul class="menu-list">
				<li v-for="(user, index) in users" :key="index">
					<router-link
						:to="{
							name: 'profile',
							params: { username: user.username }
						}"
						target="_blank"
					>
						<img
							:src="
								user.avatar.url &&
								user.avatar.type === 'gravatar'
									? `${user.avatar.url}?d=${notesUri}&s=250`
									: '/assets/notes.png'
							"
							onerror="this.src='/assets/notes.png'; this.onerror=''"
						/>

						{{ user.username }}
					</router-link>
				</li>
			</ul>
		</aside>
	</div>
</template>

<script>
import { mapState } from "vuex";

export default {
	data() {
		return {
			notesUri: ""
		};
	},
	computed: mapState({
		users: state => state.station.users,
		userCount: state => state.station.userCount
	}),
	mounted() {
		lofig.get("frontendDomain").then(frontendDomain => {
			this.notesUri = encodeURI(`${frontendDomain}/assets/notes.png`);
		});
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../styles/global.scss";

.night-mode {
	#users {
		background-color: $night-mode-bg-secondary !important;
		border: 0 !important;
	}

	a {
		color: $night-mode-text;
	}
}

#users {
	background-color: #fff;
	margin-bottom: 20px;
	padding: 10px;
	border-radius: 0 0 5px 5px;
	max-height: 100%;

	li {
		margin-top: 10px;

		a {
			display: flex;
			align-items: center;
			padding: 5px 10px;
			border: 0.5px $light-grey-2 solid;
			border-radius: 3px;
			cursor: pointer;
			color: #000 !important;

			&:hover {
				background-color: #eee;
			}

			img {
				background-color: #fff;
				width: 35px;
				height: 35px;
				border-radius: 100%;
				border: 2px solid $light-grey;
				margin-right: 10px;
			}
		}
	}

	h5 {
		font-size: 20px;
		margin: 5px;
	}
}
</style>
