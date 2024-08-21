import {Site} from "../interfaces/site";
import {error, getErrorMessage, info} from "./logger";
import {Config} from "./configFileReader";
import {callWebService} from "./webServiceCall";

export async function getSiteListFromWPVeritas(configFile: Config): Promise<Site[]> {
	let wpVeritasURL: string = configFile.WPVERITAS_URL;

	try {
		return await callWebService(configFile, true, wpVeritasURL, '', callBackFunctionFromWPVeritas);
	} catch (e) {
		error(getErrorMessage(e), { url: wpVeritasURL });
		return [];
	}
}

function callBackFunctionFromWPVeritas(url: string, res: any){
	const sites: Site[] = res;
	info(`Total sites retrieved: ${sites.length}`, { url: url, method: 'callWebService' });
	return sites;
}
