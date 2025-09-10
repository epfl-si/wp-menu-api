import {flatSitemap} from "../../src/utils/flatSitemap";
import {assert} from "chai";

describe("flatSitemap", function () {
	it("returns a list of xml snippets", function () {
		let flatmapped = flatSitemap([{url: "toto", children: [{url: "tutu", children:[{url: "tata", children:[]}]}]}]);
		console.log(flatmapped)
		assert.deepEqual(flatmapped,
			[
				'<url>\n  <loc>toto</loc>\n</url>',
				'<url>\n  <loc>tutu</loc>\n</url>',
				'<url>\n  <loc>tata</loc>\n</url>'
			])
	})
	it("returns a list of xml snippets for a more complex list", function () {
		let flatmapped = flatSitemap(
			[
				{
					url: "toto",
					children: [
						{
						url: "tonton",
						children:[
							{
								url: "tata",
								children:[]
							}
						]
					},
						{url: "tantan",
							children:[{url: "fff", children:[]}]}]
				}
			]
		);
		console.log(flatmapped)
		assert.deepEqual(flatmapped,
			[
				'<url>\n  <loc>toto</loc>\n</url>',
				'<url>\n  <loc>tonton</loc>\n</url>',
				'<url>\n  <loc>tata</loc>\n</url>',
				'<url>\n  <loc>tantan</loc>\n</url>',
				'<url>\n  <loc>fff</loc>\n</url>'
			])
	})
})
