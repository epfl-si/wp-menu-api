import 'mocha';
import {expect} from "chai";
import {configRefresh, refreshMenu} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";
import {getCachedMenus} from "../../src/menus/refresh";
import {getSiteListFromWPVeritas} from "../../src/utils/source";

describe("End To End Menu Refresh", function() {
    it('refresh has no errors', function(done) {
        const config = loadConfig('menu-api-config.yaml');
				if (config) {
					configRefresh(config);
					getSiteListFromWPVeritas(config).then((sites) => {
						refreshMenu(sites).then(() => {
							const array = getCachedMenus().menus['en'].getMenus();
							expect(array).not.to.be.empty;
							done();
						}).catch(done);
						done();
					});
				}
    });
});
