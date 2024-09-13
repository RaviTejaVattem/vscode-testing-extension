let randomString: string;

export const getRandomString = () => {
	if (!randomString) {
		randomString = Math.random().toString(36).slice(2);
	}
	return randomString;
};
