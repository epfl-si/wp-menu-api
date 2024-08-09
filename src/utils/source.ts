import {Site} from "../interfaces/site";
import {info} from "./logger";
import {Config} from "./configFileReader";
import {callWebService} from "./webServiceCall";

export async function getSiteListFromWPVeritas(configFile: Config): Promise<Site[]> {
	let wpVeritasURL: string = configFile.WPVERITAS_URL;

	return await callWebService(true, wpVeritasURL, callBackFunctionFromWPVeritas);
}

function callBackFunctionFromWPVeritas(url: string, res: any){
	const sites: Site[] = res;
	info(`Total sites retrieved: ${sites.length}`, { url: url, method: 'callWebService'});
	return sites;
}
