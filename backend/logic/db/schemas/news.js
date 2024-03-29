export default {
	title: { type: String, required: true },
	markdown: { type: String, required: true },
	status: { type: String, enum: ["draft", "published", "archived"], required: true, default: "published" },
	showToNewUsers: { type: Boolean, required: true, default: false },
	createdBy: { type: String, required: true },
	createdAt: { type: Number, default: Date.now, required: true },
	documentVersion: { type: Number, default: 3, required: true }
};
