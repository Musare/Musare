import Job from "@/Job";

// eslint-disable-next-line @typescript-eslint/ban-types
export default (JobClass: Function) => {
	// Make sure the provided JobClass has Job as the parent somewhere as a parent. Not Job itself, as that constructor requires an additional constructor parameter
	// So any class that extends Job, or that extends another class that extends Job, will be allowed.
	let classPrototype = Object.getPrototypeOf(JobClass);
	while (classPrototype) {
		if (classPrototype === Job) break;
		classPrototype = Object.getPrototypeOf(classPrototype);
	}
	if (!classPrototype) throw new Error("Provided job class is not a job.");
};
