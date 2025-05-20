<script lang="ts" setup>
import { computed, defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";
import Toast from "toasters";
import { User } from "@/types/user";
import { useUserAuthStore } from "@/stores/userAuth";
import { Station } from "@/types/station";
import { useWebsocketsStore } from "@/stores/websockets";
import DropdownListItem from "@/pages/NewStation/Components/DropdownListItem.vue";

const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);
const DropdownList = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/DropdownList.vue")
);
const ProfilePicture = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/ProfilePicture.vue")
);

const props = defineProps<{
	station: Station;
	user: User;
}>();

const { hasPermissionForStation } = useUserAuthStore();
const { socket } = useWebsocketsStore();

const router = useRouter();

const name = computed(() => props.user.name ?? props.user.username);
const isOwner = computed(() => props.station.owner === props.user._id);
const isDj = computed(
	() => !!props.station.djs.find(dj => dj._id === props.user._id)
);
const status = computed(() => {
	if (!props.user.state) return null;

	switch (props.user.state) {
		case "participate":
			return "Participating";
		case "local_paused":
			return "Paused";
		case "muted":
			return "Muted";
		case "playing":
			return "Listening";
		case "unavailable":
			return "Unavailable";
		case "buffering":
			return "Loading";
		case "station_paused":
		case "no_song":
			return "Waiting";
		case "unknown":
		default:
			return "Unknown";
	}
});

const promoteToDj = () => {
	socket.dispatch(
		"stations.addDj",
		props.station._id,
		props.user._id,
		res => {
			new Toast(res.message);
		}
	);
};

const demoteFromDj = () => {
	socket.dispatch(
		"stations.removeDj",
		props.station._id,
		props.user._id,
		res => {
			new Toast(res.message);
		}
	);
};

const viewProfile = () => {
	router.push({
		name: "profile",
		params: { username: props.user.username }
	});
};
</script>

<template>
	<div class="user-item">
		<ProfilePicture :avatar="user.avatar" :name="name" />
		<div class="user-item__content">
			<p class="user-item__name">
				<span
					v-if="isOwner"
					class="material-icons user-item__rank"
					title="Station Owner"
				>
					local_police
				</span>
				<span
					v-else-if="isDj"
					class="material-icons user-item__rank"
					title="Station DJ"
				>
					shield
				</span>
				<span :title="name">{{ name }}</span>
			</p>
			<p v-if="status" class="user-item__status" :title="status">
				{{ status }}
			</p>
		</div>
		<DropdownList>
			<Button icon="more_horiz" square inverse title="Actions" />

			<template #options>
				<DropdownListItem
					v-if="
						hasPermissionForStation(
							station._id,
							'stations.djs.add'
						) &&
						!isOwner &&
						!isDj
					"
					icon="add_moderator"
					label="Promote to DJ"
					@click="promoteToDj"
				/>
				<DropdownListItem
					v-if="
						hasPermissionForStation(
							station._id,
							'stations.djs.remove'
						) &&
						!isOwner &&
						isDj
					"
					icon="remove_moderator"
					label="Demote from DJ"
					@click="demoteFromDj"
				/>
				<DropdownListItem
					icon="account_circle"
					label="View profile"
					@click="viewProfile"
				/>
			</template>
		</DropdownList>
	</div>
</template>

<style lang="less" scoped>
.user-item {
	display: flex;
	background-color: var(--white);
	border-radius: 5px;
	border: solid 1px var(--light-grey-1);
	padding: 5px;
	gap: 5px;

	:deep(.profile-picture) {
		height: 30px;
		width: 30px;
		flex-shrink: 0;

		&--initials span {
			font-size: 14px;
		}
	}

	&__name {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 12px !important;
		line-height: 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__rank {
		color: var(--primary-color);
		font-size: 12px !important;
	}

	&__status {
		display: inline-flex;
		align-items: center;
		font-size: 10px !important;
		font-weight: 500 !important;
		line-height: 12px;
		color: var(--dark-grey-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__content {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-width: 0;
		justify-content: center;
	}
}
</style>
