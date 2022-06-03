<template>
	<floating-box
		v-if="activeJobs.length > 0"
		title="Jobs"
		id="longJobs"
		ref="longJobs"
		:persist="true"
		initial="align-bottom"
		:min-width="200"
		:max-width="400"
		:min-height="200"
	>
		<template #body>
			<div class="active-jobs">
				<div
					v-for="job in activeJobs"
					:key="`activeJob-${job.id}`"
					class="active-job"
				>
					<i
						v-if="
							job.status === 'started' || job.status === 'update'
						"
						class="material-icons"
						content="In Progress"
						v-tippy="{ theme: 'info', placement: 'right' }"
					>
						pending
					</i>
					<i
						v-else-if="job.status === 'success'"
						class="material-icons success"
						content="Complete"
						v-tippy="{ theme: 'info', placement: 'right' }"
					>
						check_circle
					</i>
					<i
						v-else
						class="material-icons error"
						content="Failed"
						v-tippy="{ theme: 'info', placement: 'right' }"
					>
						error
					</i>
					<div class="name" :title="job.name">{{ job.name }}</div>
					<div class="actions">
						<i
							class="material-icons clear"
							:class="{
								disabled: !(
									job.status === 'success' ||
									job.status === 'error'
								)
							}"
							content="Clear"
							v-tippy="{ placement: 'left' }"
							@click="remove(job)"
						>
							remove_circle
						</i>
						<tippy
							:touch="true"
							:interactive="true"
							placement="left"
							ref="longJobMessage"
							:append-to="body"
						>
							<i class="material-icons">chat</i>

							<template #content>
								<div class="long-job-message">
									<strong>Latest Update:</strong>
									<span :title="job.message">{{
										job.message
									}}</span>
								</div>
							</template>
						</tippy>
					</div>
				</div>
			</div>
		</template>
	</floating-box>
</template>

<script>
import { mapState, mapActions } from "vuex";

import FloatingBox from "@/components/FloatingBox.vue";

export default {
	components: {
		FloatingBox
	},
	data() {
		return {
			minimise: true,
			body: document.body
		};
	},
	computed: {
		...mapState("longJobs", {
			activeJobs: state => state.activeJobs
		})
	},
	methods: {
		remove(job) {
			if (job.status === "success" || job.status === "error")
				this.removeJob(job.id);
		},
		...mapActions("longJobs", ["removeJob"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	#longJobs {
		.active-jobs {
			.active-job {
				background-color: var(--dark-grey);
				border: 0;
			}
		}
	}

	.long-job-message {
		color: var(--black);
	}
}

#longJobs {
	z-index: 5000 !important;

	.active-jobs {
		.active-job {
			display: flex;
			padding: 5px;
			margin: 5px 0;
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;

			&:first-child {
				margin-top: 0;
			}

			&:last-child {
				margin-bottom: 0;
			}

			.name {
				line-height: 24px;
				font-weight: 600;
				text-transform: capitalize;
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				margin-right: auto;
			}

			.material-icons {
				font-size: 20px;
				color: var(--primary-color);
				margin: auto 5px auto 0;
				cursor: pointer;

				&.success {
					color: var(--green);
				}

				&.error,
				&.clear {
					color: var(--red);
				}

				&.disabled {
					color: var(--light-grey-3);
					cursor: not-allowed;
				}
			}

			.actions {
				display: flex;

				.material-icons {
					margin: auto 0 auto 5px;
				}

				& > span {
					display: flex;
					padding: 0;
				}
			}
		}
	}
}

.long-job-message {
	display: flex;
	flex-direction: column;

	strong {
		font-size: 12px;
	}

	span {
		display: -webkit-inline-box;
		text-overflow: ellipsis;
		white-space: normal;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
		max-width: 200px;
		font-size: 12px;
	}
}
</style>