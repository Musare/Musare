<template>
	<modal title='Report'>
		<div slot='body'>
			<article class="message">
				<div class="message-body">
					<strong>Song ID: </strong>{{ $parent.editing.songId }}<br/ >
					<strong>Created By: </strong>{{ $parent.editing.createdBy }}<br/ >
					<strong>Created At: </strong>{{ $parent.editing.createdAt }}<br/ >
					<span v-if='$parent.editing.description'><strong>Description: </strong>{{ $parent.editing.description }}</span>
				</div>
			</article>
			<table class='table is-narrow' v-if='$parent.editing.issues.length > 0'>
				<thead>
					<tr>
						<td>Issue</td>
						<td>Reasons</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for='(index, issue) in $parent.editing.issues' track-by='$index'>
						<td>
							<span>{{ issue.name }}</span>
						</td>
						<td>
							<span>{{ issue.reasons }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div slot='footer'>
			<a class='button is-primary' @click='$parent.resolve($parent.editing._id)' href='#'>
				<span>Resolve</span>
			</a>
			<a class='button is-danger' @click='$parent.toggleModal()' href='#'>
				<span>Cancel</span>
			</a>
		</div>
	</modal>
</template>

<script>
	import Modal from './Modal.vue';

	export default {
		components: { Modal },
		events: {
			closeModal: function () {
				this.$parent.modals.report = false;
			}
		}
	}
</script>
