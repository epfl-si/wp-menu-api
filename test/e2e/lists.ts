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
        const config = loadConfig('menu-api-config.yaml');
        const pathRefreshFile = config?.PATH_REFRESH_FILE || ".";

        configRefresh(config);
        configLinks(config);
        readRefreshFile(pathRefreshFile);
        done();
    });
    describe("Breadcrumb", function() {
        it('has at list one parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/en/website/", "en", "breadcrumb");
            assert(items.length>1);
        });
        it('has a specific parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/en/website/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('has a specific parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/en/it-services/storage-of-documents/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('has Campus as parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/website/en/website/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Campus')).not.be.undefined;
        });
        it('has Services&Resources as parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/en/it-services/storage-of-documents/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('has Schools as parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/schools/sb/research/isic/platforms/it-and-data-management-platform/purchasing-procedure/", "en", "breadcrumb");
            expect(items.find(f => f.url=='https://www.epfl.ch/schools/sb/en/home/')).not.be.undefined;
        });
        it('has no Lab parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/labs/en/laboratories/", "en", "breadcrumb");
            assert(items.length == 1);
        });
        it('has Labs as parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/labs/alice/en/index-fr-html/", "en", "breadcrumb");
            assert(items.length == 2);
            expect(items.find(f => f.url == 'https://www.epfl.ch/labs/en/laboratories/')).not.be.undefined;
        });
        it('has Student Assoc and campus as parents', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/associations/list/en/all-associations/", "en", "breadcrumb");
            expect(items.find(f => f.url == 'https://www.epfl.ch/campus/associations/en/student-associations/')).not.be.undefined;
            expect(items.find(f => f.url == 'https://www.epfl.ch/campus/en/campusenglish/')).not.be.undefined;
        });
        it('has Assoc as parent', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/associations/list/spaceat/en/spaceyourservice/", "en", "breadcrumb");
            assert(items.length == 4);
            expect(items.find(f => f.url == 'https://www.epfl.ch/campus/associations/list/en/all-associations/')).not.be.undefined;
        });
        it('has campus in parents', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/associations/list/adec/index-html/the-comitee/", "en", "breadcrumb");
            assert(items.length == 5);
            expect(items.find(f => f.url == 'https://www.epfl.ch/campus/en/campusenglish/')).not.be.undefined;
        });
        it('has one list assoc item', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/associations/list/en/all-associations/", "en", "breadcrumb");
            assert(items.filter(f => f.url == 'https://www.epfl.ch/campus/associations/list/en/all-associations/').length == 1);
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
        it('has Room Reservations as sibling', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/services/en/it-services/storage-of-documents/", "en", "siblings");
            expect(items.find(f => f.url=='https://www.epfl.ch/campus/services/en/it-services/room-reservations/')).not.be.undefined;
        });
        it('has Storage as sibling', async function() {
            const items = getMenuItems("https://www.epfl.ch/schools/sb/research/isic/platforms/it-and-data-management-platform/purchasing-procedure/", "en", "siblings");
            expect(items.find(f => f.url=='https://www.epfl.ch/campus/services/en/it-services/storage-of-documents/')).not.be.undefined;
        });
        it('has 7 siblings in the level 0', async function() {
            const items = getMenuItems("https://www.epfl.ch/campus/en/campusenglish/", "en", "siblings");
            assert(items.length == 7);
        });
    });
});
