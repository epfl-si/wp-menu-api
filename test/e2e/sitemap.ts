import 'mocha';
import {assert} from "chai";
import {getSitesHierarchy} from "../../src/menus/lists";
import {configRefresh, refreshFromAPI} from "../../src/menus/refresh";
import {Config, loadConfig} from "../../src/utils/configFileReader";
import {configLinks} from "../../src/utils/links";
import {configLogs} from "../../src/utils/logger";
import {configSite} from "../../src/interfaces/site";

let config: Config | undefined;

describe("End To End SiteHierarchy", function() {
    before(function(done){
        this.timeout(50000);

        config = loadConfig('menu-api-config.yaml');
        if (config) {
            configRefresh(config);
            configLinks(config);
            configLogs(config);
            configSite(config);

            refreshFromAPI().then(() => {
                done(); // Called only when refreshFromAPI completes
            }).catch(done); // Handles errors properly
        } else {
            throw new Error("Config not present");
        }
    });
    describe("Site hierarchy", function() {
        it('site hierarchy is not empty', async function() {
            const siteHierarchy = await getSitesHierarchy("https://wpn-test.epfl.ch/campus/services/website/en/website/", "en", config);
            assert(siteHierarchy.result.length > 0);
        });
    });
});
