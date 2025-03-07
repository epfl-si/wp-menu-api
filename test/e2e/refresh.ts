import 'mocha';
import {expect} from "chai";
import {configRefresh, refreshFileMenu} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";
import fs from "fs";
import {configSite} from "../../src/interfaces/site";

describe("End To End Menu Refresh", function() {
    /*it('refresh has no errors', function (done) {
			const config = loadConfig('menu-api-config.yaml');
			if ( config ) {
				configRefresh(config);
				configSite(config);

				refresh().then(() => {
					const content2: string = fs.readFileSync('./menus_en.json', 'utf8');
					const indices2 = getIndicesOf("/labs/hobel/wp-json/epfl/v1/menus/top?lang=en", content2);
					expect(indices2.length==1);
					done();
				});
			}
		});*/
});

function getIndicesOf(searchStr: string, str: string) {
	var searchStrLen = searchStr.length;
	if (searchStrLen == 0) {
		return [];
	}
	var startIndex = 0, index, indices = [];
	str = str.toLowerCase();
	searchStr = searchStr.toLowerCase();
	while ((index = str.indexOf(searchStr, startIndex)) > -1) {
		indices.push(index);
		startIndex = index + searchStrLen;
	}
	return indices;
}

async function refresh() {
	await refreshFromAPI();
}
