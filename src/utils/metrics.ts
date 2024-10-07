import fs from "fs";
import {
	refresh_files_size,
	total_categories,
	total_pages,
	total_posts,
	total_retrieved_sites,
	total_WPV_sites
} from "./logger";
import {getCachedMenus} from "../menus/refresh";
import {Site} from "../interfaces/site";
import {MenusCache} from "./cache";
import {MenuEntry} from "../interfaces/MenuEntry";

export function prometheusChecks(pathRefreshFile: string) {
	getCachedMenus().checkFileCache(pathRefreshFile);
	getCachedMenus().checkCache();
}

export function getWPVeritasSitesForEnvironment(filteredListOfSites: Site[]) {
	const groupedByOpenShiftEnvironment = filteredListOfSites.reduce((acc, item) => {
		if (!acc[item.openshiftEnv]) {
			acc[item.openshiftEnv] = [];
		}
		acc[item.openshiftEnv].push(item);
		return acc;
	}, {} as Record<string, Site[]>);
	for (const category in groupedByOpenShiftEnvironment) {
		if (groupedByOpenShiftEnvironment.hasOwnProperty(category)) {
			total_WPV_sites.labels({openshiftEnvironment: category}).set(groupedByOpenShiftEnvironment[category].length);
		}
	}
}

export function getRetrievedSitesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			total_retrieved_sites.labels({lang: lang}).set(cachedMenus.menus[lang].length);
		}
	}
}

export function getPagesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getPages())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_pages.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getPostsCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getPosts())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_posts.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getCategoriesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getCategories())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_categories.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

function getGroupedArray(pages: {urlInstanceRestUrl: string, entries: MenuEntry}[]) {
	return pages.reduce((grouped: { [site: string]: MenuEntry[] }, page: { urlInstanceRestUrl: string, entries: MenuEntry }) => {
		const site = cleanUrl(page.urlInstanceRestUrl);
		if (!grouped[site]) {
			grouped[site] = [];
		}
		grouped[site].push(page.entries);
		return grouped;
	}, {});
}

function cleanUrl(site: string) {
	let subUrl = site;
	if (site.indexOf("wp-json") > -1) {
		subUrl = site.substring(site.indexOf("wp-json") + 7);
	}
	return subUrl;
}
