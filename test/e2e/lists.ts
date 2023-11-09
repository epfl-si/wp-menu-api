import 'mocha';
import {assert, expect} from "chai";
import {getMenuItems} from "../../src/menus/lists";
import {refreshMenu} from "../../src/menus/refresh";


describe("End To End Menu", function() {
    beforeEach(function(done){
        refreshMenu().then(() => {
            done();
        }).catch(done);
    });
    describe("Breadcrumb", function() {
        it('has at list one parent', async function() {
            const items = getMenuItems("http://wp-httpd/campus/services/website/", "en", "breadcrumb");
            assert(items.length>1);
        });
        it('has a specific parent', async function() {
            const items = getMenuItems("http://wp-httpd/campus/services/website/", "en", "breadcrumb");
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
    });
    describe("Siblings", function() {
        it('a site has siblings', async function() {
            const items = getMenuItems("http://wp-httpd/campus/services/website/support-courses-web-workshop/", "en", "siblings");
            assert(items.length>1);
        });
        it('a site has a specific sibling', async function() {
            const items = getMenuItems("http://wp-httpd/campus/services/website/support-courses-web-workshop/", "en", "siblings");
            expect(items.find(f => f.title=='Close a website')).not.be.undefined;
        });
    });
});
