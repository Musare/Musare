<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const props = defineProps({
	avatar: {
		type: Object,
		default: () => {}
	},
	name: {
		type: String,
		default: ": )"
	}
});

const notes = ref("");

const initials = computed(() =>
	props.name
		.replaceAll(/[^A-Za-z ]+/g, "")
		.replaceAll(/ +/g, " ")
		.split(" ")
		.map(word => word.charAt(0))
		.splice(0, 2)
		.join("")
		.toUpperCase()
);

onMounted(async () => {
	const frontendDomain = await lofig.get("frontendDomain");
	notes.value = encodeURI(`${frontendDomain}/assets/notes.png`);
});
</script>

<template>
	<img
		class="profile-picture using-gravatar"
		v-if="avatar.type === 'gravatar'"
		:src="
			avatar.url ? `${avatar.url}?d=${notes}&s=250` : '/assets/notes.png'
		"
		onerror="this.src='/assets/notes.png'; this.onerror=''"
	/>
	<div class="profile-picture using-initials" :class="avatar.color" v-else>
		<span>{{ initials }}</span>
	</div>
</template>

<style lang="less" scoped>
.profile-picture {
	width: 100px;
	height: 100px;
	border-radius: 100%;
	border: 0.5px solid var(--light-grey-3);

	&.using-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--light-grey-2);
		font-family: Nunito, sans-serif;
		font-weight: 400;
		user-select: none;
		-webkit-user-select: none;

		span {
			font-size: 40px; // 2/5th of .profile-picture height/width
		}

		&.blue {
			background-color: var(--blue);
			color: var(--white);
		}
		&.orange {
			background-color: var(--orange);
			color: var(--white);
		}
		&.green {
			background-color: var(--green);
			color: var(--white);
		}
		&.purple {
			background-color: var(--purple);
			color: var(--white);
		}
		&.teal {
			background-color: var(--teal);
			color: var(--white);
		}
		&.grey {
			background-color: var(--grey);
			color: var(--white);
		}
	}
}
</style>
