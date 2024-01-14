import Job from "@/Job";

type JobConstructorParameters = ConstructorParameters<typeof Job>;
// Borrowed from https://dev.to/futuresight/how-2-typescript-get-the-last-item-type-from-a-tuple-of-types-3fh3#comment-gb5d
type DropFirstInTuple<T extends any[]> = ((...args: T) => any) extends (
	arg: any,
	...rest: infer U
) => any
	? U
	: T;
type DerivedJobConstructorParameters =
	DropFirstInTuple<JobConstructorParameters>;

export interface JobDerived extends Job {
	new (...args: DerivedJobConstructorParameters): Job & typeof Job;
}
