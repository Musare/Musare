<template>
	<tippy
		class="runJobDropdown"
		:touch="true"
		:interactive="true"
		placement="bottom-end"
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
			<button class="button dropdown-toggle">
				<i class="material-icons">
					{{ showJobDropdown ? "expand_more" : "expand_less" }}
				</i>
			</button>
		</div>

		<template #content>
			<div class="nav-dropdown-items" v-if="jobs.length > 0">
				<quick-confirm
					v-for="(job, index) in jobs"
					:key="`job-${index}`"
					placement="top"
					@confirm="runJob(job)"
				>
					<button class="nav-item button" :title="job.name">
						<i
							class="material-icons icon-with-button"
							content="Run Job"
							v-tippy
							>play_arrow</i
						>
						<p>{{ job.name }}</p>
					</button>
				</quick-confirm>
			</div>
			<p v-else class="no-jobs">No jobs available.</p>
		</template>
	</tippy>
</template>

<script>
import { mapGetters } from "vuex";

export default {
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
			let id;
			let title;

			this.socket.dispatch(job.socket, {
				cb: () => {},
				onProgress: res => {
					if (res.status === "started") {
						id = res.id;
						title = res.title;
					}

					if (id)
						this.setJob({
							id,
							name: title,
							...res
						});
				}
			});
		}
	}
};
</script>

<style lang="less" scoped>
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
