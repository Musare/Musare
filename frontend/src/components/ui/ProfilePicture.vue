<template>
	<img
		class="profile-picture using-gravatar"
		v-if="avatar.type === 'gravatar'"
		:src="
			avatar.url ? `${avatar.url}?d=${notes}&s=250` : '/assets/notes.png'
		"
		onerror="this.src='/assets/notes.png'; this.onerror=''"
	/>
	<div class="profile-picture using-initials" v-else>
		{{ initials }}
	</div>
</template>

<script>
export default {
	props: {
		avatar: {
			type: Object,
			default: () => {}
		},
		name: {
			type: String,
			default: ": )"
		}
	},
	data() {
		return {
			notes: ""
		};
	},
	computed: {
		initials() {
			return this.name
				.split(" ")
				.map(word => word.charAt(0))
				.join("")
				.toUpperCase();
		}
	},
	async mounted() {
		const frontendDomain = await lofig.get("frontendDomain");
		this.notes = encodeURI(`${frontendDomain}/assets/notes.png`);
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.profile-picture {
	width: 100px;
	height: 100px;
	border-radius: 100%;
	border: 0.5px solid $light-grey-2;

	&.using-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #ddd;
		font-family: "Inter", sans-serif;
		font-weight: 400;
		font-size: 50px;
		user-select: none;
		-webkit-user-select: none;
	}
}
</style>
