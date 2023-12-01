import 'mocha';
import {expect} from "chai";
import {configRefresh, getArraySiteTreeByLanguage, refreshMenu} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";

describe("End To End Menu Refresh", function() {
    it('refresh has no errors', function(done) {
        const config = loadConfig('menu-api-configmap.yaml');
        configRefresh(config);

        refreshMenu().then(() => {
            const array = getArraySiteTreeByLanguage('en');
            expect(array).not.to.be.empty;
            done();
        }).catch(done);
    });
});
