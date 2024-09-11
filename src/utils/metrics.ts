import fs from "fs";
import {refresh_files_size, total_refresh_files} from "./logger";
import {getCachedMenus} from "../menus/refresh";

function checkRefreshFile(pathRefreshFile: string) {
	for (const lang in getCachedMenus()) {
		if (fs.existsSync(pathRefreshFile.concat('/menus_' + lang + '.json'))) {
			total_refresh_files.labels({fileName: '/menus_' + lang + '.json'}).set(1);
			refresh_files_size.labels({fileName: '/menus_' + lang + '.json'}).set(fs.statSync(pathRefreshFile.concat('/menus_' + lang + '.json')).size);
		} else {
			total_refresh_files.labels({fileName: '/menus_' + lang + '.json'}).set(0);
			refresh_files_size.labels({fileName: '/menus_' + lang + '.json'}).set(0);
		}
	}
}

export function prometheusChecks(pathRefreshFile: string) {
	checkRefreshFile(pathRefreshFile);
	getCachedMenus().checkCache();
}
