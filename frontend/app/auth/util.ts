export function getAccessToken() {
	return 'Bearer ' + (localStorage.getItem('ACCESS_TOKEN') as string) || '';
}
