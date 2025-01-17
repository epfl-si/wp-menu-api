import {Site} from "../interfaces/site";
import {error, getErrorMessage, increaseRefreshErrorCount, info} from "./logger";
import {Config} from "./configFileReader";
import {callWebService} from "./webServiceCall";
import { exec } from 'child_process';

export async function getSiteListFromInventory(configFile: Config, openshift4PodName: string): Promise<Site[]> {
	const k8slist = await getSiteListFromKubernetes();
	const wpveritaslist = await getSiteListFromWPVeritas(configFile, openshift4PodName);
	return wpveritaslist.concat(k8slist);
}

async function getSiteListFromWPVeritas(configFile: Config, openshift4PodName: string): Promise<Site[]> {
	let wpVeritasURL: string = configFile.WPVERITAS_URL; // TODO filter on unmigrated sites

	try {
		return await callWebService(configFile, true, wpVeritasURL, '', openshift4PodName, callBackFunctionFromWPVeritas);
	} catch (e) {
		increaseRefreshErrorCount();
		error(getErrorMessage(e), { url: wpVeritasURL });
		return [];
	}
}

async function getSiteListFromKubernetes(): Promise<Site[]> {
	/*	const k8s = await import('@kubernetes/client-node');

        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();

        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

        k8sApi.listNamespacedPod({namespace: 'svc0041t-wordpress'}).then((res: any) => {
            console.log(res.body);
        }).catch(err => {
            console.error(err);
        });

        return [];*/

	const items = await getKubernetesResources('wps');
	const resources = items.map((item: any) => {
		const url = 'https://' + item.spec?.hostname + item.spec?.path;
		return new Site(url, 'OS4', true);
	});

	return resources;
}

export const getKubernetesResources = (resourceType: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		exec(`kubectl get ${resourceType} -o json`, (e, stdout, stderr) => {
			if (e) {
				error(`Error: ${stderr}`, {});
				return [];
			} else {
				const parsedResult = JSON.parse(stdout);

				if (!parsedResult.items || !Array.isArray(parsedResult.items)) {
					error('Unexpected response format: Missing or invalid "items" field', {});
					return [];
				}

				const items = parsedResult.items;
				resolve(items);
			}
		});
	});
};

function callBackFunctionFromWPVeritas(url: string, res: any){
	const inventory: any[] = res;
	const sites = inventory.map(i =>  new Site(i.url, i.openshiftEnv, i.wpInfra));
	info(`Total sites retrieved: ${sites.length}`, { url: url, method: 'callWebService' });
	return sites;
}

export async function getOpenshift4PodName (): Promise<string> {
	const items = await getKubernetesResources('pods');
	const wp_ngins = items.find((i: any) => i.metadata.name.indexOf('wp-nginx') > -1).metadata.name;
	console.log(wp_ngins);
	return wp_ngins;
}
