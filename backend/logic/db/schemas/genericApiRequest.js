export default {
	url: { type: String, required: true },
	params: { type: Object },
	responseData: { type: Object, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
