<template>
	<modal title='Report Issues'>
		<div slot='body'>
			<table class='table is-narrow'>
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
		components: { Modal }
	}
</script>