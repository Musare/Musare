export const getErrorMessage = (
	error: unknown,
	defaultErrorMessage: string | null = null
) => {
	if (error instanceof Error) return error.message;
	if (error) return String(error);
	if (defaultErrorMessage) return defaultErrorMessage;
	return "Unknown error";
};
