import {error, getErrorMessage, info} from "./logger";

export async function callWebService(url: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const headers: Headers = new Headers();
	headers.set('Content-Type', 'application/json');
	headers.set('Accept', 'application/json');

	info('Start web service call', { url: url, method: 'callWebService'});
	const request: RequestInfo = new Request(url, {
		method: 'GET',
		headers: headers
	});

	return fetch(request).then(res => res.json()).then(res => {
		info(`End web service call`, { url: url, method: 'callWebService'});
		return callBackFunction(url, res);
	}).catch ((e) => {
		error(getErrorMessage(e), { url: url, method: 'callWebService'});
		return [];
	});
}
