import 'mocha';
import {assert} from "chai";
import {getSitemap} from "../../src/menus/lists";
import {configRefresh, refreshFromAPI} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";
import {configLinks} from "../../src/utils/links";
import {configLogs} from "../../src/utils/logger";
import {configSite} from "../../src/interfaces/site";

describe("End To End Sitemap", function() {
    before(function(done){
        this.timeout(50000);

        const config = loadConfig('menu-api-config.yaml');
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
    describe("Sitemap", function() {
        it('sitemap is not empty', async function() {
            const sitemap = await getSitemap("https://wpn-test.epfl.ch/campus/services/website/en/website/", "en");
            assert(sitemap);
        });
    });
});
