<script lang="ts" setup>
import { computed, defineAsyncComponent, reactive } from "vue";
import Toast from "toasters";
import { Station } from "@/types/station";
import { useUserAuthStore } from "@/stores/userAuth";
import { useWebsocketsStore } from "@/stores/websockets";

const props = defineProps<{
	station: Station;
	canVoteToSkip: boolean;
	votedToSkip: boolean;
	votesToSkip: number;
	votesRequiredToSkip: number;
}>();

const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);
const Input = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Input.vue")
);
const InputGroup = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/InputGroup.vue")
);
const Pill = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Pill.vue")
);
const Sidebar = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Sidebar.vue")
);
const Tabs = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Tabs.vue")
);
const UserItem = defineAsyncComponent(
	() => import("@/pages/NewStation/UserItem.vue")
);

const { loggedIn, hasPermissionForStation } = useUserAuthStore();

const { socket } = useWebsocketsStore();

const isOwner = userId => props.station.owner === userId;

const djSearch = reactive({
	query: "",
	searchedQuery: "",
	page: 0,
	count: 0,
	resultsLeft: 0,
	pageSize: 0,
	results: [],
	nextPageResultsCount: 0
});

const userTabs = computed(() => {
	const tabs = ["Audience"];

	if (hasPermissionForStation(props.station._id, "stations.update"))
		tabs.push("DJs");

	return tabs;
});

const sortedUsers = computed(() =>
	props.station.users && props.station.users.loggedIn
		? props.station.users.loggedIn
				.slice()
				.sort(
					(a, b) =>
						Number(isOwner(b._id)) - Number(isOwner(a._id)) ||
						Number(!isOwner(a._id)) - Number(!isOwner(b._id))
				)
		: []
);

const favorite = () => {
	socket.dispatch("stations.favoriteStation", props.station._id, res => {
		if (res.status === "success") {
			new Toast("Successfully favorited station.");
		} else new Toast(res.message);
	});
};

const unfavorite = () => {
	socket.dispatch("stations.unfavoriteStation", props.station._id, res => {
		if (res.status === "success") {
			new Toast("Successfully unfavorited station.");
		} else new Toast(res.message);
	});
};

const resetDjsSearch = () => {
	djSearch.query = "";
	djSearch.searchedQuery = "";
	djSearch.page = 0;
	djSearch.count = 0;
	djSearch.resultsLeft = 0;
	djSearch.pageSize = 0;
	djSearch.results = [];
	djSearch.nextPageResultsCount = 0;
};

const searchForDjs = (page: number) => {
	if (djSearch.page >= page || djSearch.searchedQuery !== djSearch.query) {
		djSearch.results = [];
		djSearch.page = 0;
		djSearch.count = 0;
		djSearch.resultsLeft = 0;
		djSearch.pageSize = 0;
		djSearch.nextPageResultsCount = 0;
	}

	djSearch.searchedQuery = djSearch.query;
	socket.dispatch("users.search", djSearch.query, page, res => {
		const { data } = res;
		if (res.status === "success") {
			const { count, pageSize, users } = data;
			djSearch.results = [...djSearch.results, ...users];
			djSearch.page = page;
			djSearch.count = count;
			djSearch.resultsLeft = count - djSearch.results.length;
			djSearch.pageSize = pageSize;
			djSearch.nextPageResultsCount = Math.min(
				djSearch.pageSize,
				djSearch.resultsLeft
			);
		} else if (res.status === "error") {
			djSearch.results = [];
			djSearch.page = 0;
			djSearch.count = 0;
			djSearch.resultsLeft = 0;
			djSearch.pageSize = 0;
			djSearch.nextPageResultsCount = 0;
			new Toast(res.message);
		}
	});
};
</script>

<template>
	<Sidebar>
		<section class="information">
			<div class="information__header">
				<i
					v-if="loggedIn && station.isFavorited"
					class="material-icons"
					@click.prevent="unfavorite"
					title="Favorite station"
					>star</i
				>
				<i
					v-else-if="loggedIn"
					class="material-icons"
					@click.prevent="favorite"
					title="Unfavorite station"
					>star_border</i
				>
				<h1>{{ station.displayName }}</h1>
			</div>
			<div class="information__actions">
				<Pill v-if="station.privacy === 'public'" icon="public">
					Public
				</Pill>
				<Pill v-else-if="station.privacy === 'unlisted'" icon="link">
					Unlisted
				</Pill>
				<Pill v-else-if="station.privacy === 'private'" icon="lock">
					Private
				</Pill>
			</div>
			<p style="min-height: 60px">{{ station.description }}</p>
			<div class="information__actions">
				<Button icon="share">Share</Button>
			</div>
		</section>
		<hr class="sidebar__divider" />
		<Tabs :tabs="userTabs">
			<template #Audience>
				<UserItem
					v-for="user in sortedUsers"
					:key="`audience-${user._id}`"
					:station="station"
					:user="user"
				/>

				<p
					v-if="station.users && station.users.loggedOut?.length > 0"
					class="guest-users"
				>
					{{ sortedUsers.length > 0 ? "..and" : "There are" }}
					{{ station.users.loggedOut.length }} logged-out users.
				</p>
			</template>
			<template #DJs>
				<h3 style="margin: 0; font-size: 16px; font-weight: 600">
					Add DJ
				</h3>
				<p style="font-size: 14px">
					Search for a user to promote to DJ.
				</p>
				<InputGroup
					is="form"
					@submit.prevent="searchForDjs(1)"
					@reset.prevent="resetDjsSearch"
				>
					<Input
						class="input_group__expanding"
						v-model="djSearch.query"
						required
					>
						Query
					</Input>
					<Button
						type="reset"
						icon="restart_alt"
						square
						grey
						title="Reset search"
					/>
					<Button type="submit" icon="search" square title="Search" />
				</InputGroup>

				<UserItem
					v-for="dj in djSearch.results"
					:key="`dj-search-${dj._id}`"
					:station="station"
					:user="dj"
				/>

				<Button
					v-if="djSearch.resultsLeft > 0"
					icon="search"
					@click.prevent="searchForDjs(djSearch.page + 1)"
				>
					Load {{ djSearch.nextPageResultsCount }}
					more results
				</Button>

				<p
					v-if="djSearch.page > 0 && djSearch.results.length === 0"
					class="guest-users"
				>
					No users found with this search query.
				</p>

				<hr class="sidebar__divider" />

				<h3 style="margin: 0; font-size: 16px; font-weight: 600">
					Current DJs
				</h3>

				<UserItem
					v-for="dj in station.djs"
					:key="`djs-${dj._id}`"
					:station="station"
					:user="dj"
				/>

				<p v-if="station.djs.length === 0" class="guest-users">
					There are currently no DJs.
				</p>
			</template>
		</Tabs>
	</Sidebar>
</template>

<style lang="less" scoped>
.information {
	display: flex;
	flex-direction: column;
	gap: 10px;

	&__header {
		display: flex;
		align-items: center;
		gap: 10px;

		h1 {
			font-size: 26px;
			font-weight: 600;
			margin: 0;
		}

		i {
			font-size: 26px;
			color: var(--yellow);
			// TODO: Wrap in button
		}
	}

	&__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
}

.guest-users {
	color: var(--dark-grey-1);
	font-size: 14px !important;
	font-weight: 500 !important;
	text-align: center;
	padding: 5px;
}
</style>
