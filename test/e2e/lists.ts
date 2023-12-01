import 'mocha';
import {assert, expect} from "chai";
import {getMenuItems} from "../../src/menus/lists";
import {configRefresh, readRefreshFile, refreshFileMenu, refreshMenu} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";
import {configLinks} from "../../src/utils/links";
import {info} from "../../src/utils/logger";
import fs from "fs";

describe("End To End Menu", function() {
    beforeEach(function(done){
        const config = loadConfig('menu-api-configmap.yaml');
        const pathRefreshFile = config?.PATH_REFRESH_FILE || ".";

        configRefresh(config);
        configLinks(config);
        readRefreshFile(pathRefreshFile);
        done();
    });
    describe("Breadcrumb", function() {
        it('has at list one parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/", "en", "breadcrumb");
            assert(items.length>1);
        });
        it('has a specific parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('has a specific parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/en/it-services/storage-of-documents/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
    });
    describe("Siblings", function() {
        it('a site has siblings', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/support-courses-web-workshop/", "en", "siblings");
            assert(items.length>1);
        });
        it('a site has a specific sibling', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/support-courses-web-workshop/", "en", "siblings");
            expect(items.find(f => f.title=='Close a website')).not.be.undefined;
        });
        it("doesn't contain external menus", async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/en/campusenglish/", "en", "siblings");
            assert.deepEqual(items.filter(f => f.object=='epfl-external-menu'), []);
        });
    });
});
