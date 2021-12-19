<template>
	<tippy
		class="runJobDropdown"
		:touch="true"
		:interactive="true"
		placement="bottom-start"
		theme="dropdown"
		ref="dropdown"
		trigger="click"
		append-to="parent"
		@show="
			() => {
				showJobDropdown = true;
			}
		"
		@hide="
			() => {
				showJobDropdown = false;
			}
		"
	>
		<div class="control has-addons" ref="trigger">
			<button class="button is-primary">Run Job</button>
			<button class="button">
				<i class="material-icons">
					{{ showJobDropdown ? "expand_more" : "expand_less" }}
				</i>
			</button>
		</div>

		<template #content>
			<div class="nav-dropdown-items" v-if="jobs.length > 0">
				<confirm
					v-for="(job, index) in jobs"
					:key="`job-${index}`"
					placement="top"
					@confirm="runJob(job)"
				>
					<button class="nav-item button" :title="job.name">
						<i
							@click="runJob(job)"
							class="material-icons icon-with-button"
							content="Run Job"
							v-tippy
							>play_arrow</i
						>
						<p>{{ job.name }}</p>
					</button>
				</confirm>
			</div>
			<p v-else class="no-jobs">No jobs available.</p>
		</template>
	</tippy>
</template>

<script>
import { mapGetters } from "vuex";

import Toast from "toasters";
import Confirm from "@/components/Confirm.vue";

export default {
	components: {
		Confirm
	},
	props: {
		jobs: {
			type: Array,
			default: () => []
		}
	},
	data() {
		return {
			showJobDropdown: false
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		runJob(job) {
			new Toast(`Running job: ${job.name}`);
			this.socket.dispatch(job.socket, data => {
				if (data.status !== "success")
					new Toast({
						content: `Error: ${data.message}`,
						timeout: 8000
					});
				else new Toast({ content: data.message, timeout: 4000 });
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.nav-dropdown-items {
	& > span:not(:last-child) .nav-item.button {
		margin-bottom: 10px !important;
	}
	.nav-item.button .icon-with-button {
		font-size: 22px;
		color: var(--primary-color);
	}
}

.no-jobs {
	text-align: center;
	margin: 10px 0;
}
</style>
