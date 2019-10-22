const fs = require('fs');
const util = require('util');
const puppeteer = require('puppeteer');
const prompts = require('prompts');
const parseDomain = require('parse-domain');
const { crawl } = require('adstxt');
const { crawlHash } = require('./crawlerHash');
const gKeys = require('./gKeysResseler');
const adDict = require('./adDict');
const helpers = require('./helpers');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);

var store = [];

(async () => {
	const data = await readFile('data.csv', 'utf8');
	const csvRead = data.split('\r\n');

	const browser = await puppeteer.launch({
		headless: false,
		ignoreHTTPSErrors: true,
		args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
	});
	const page = await browser.newPage();

	await page.setRequestInterception(true);
	page.on('request', (r) => r.continue());

	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.87 Safari/537.36'
	);

	await page.setViewport({
		width: 1680,
		height: 1050
	});

	for (let actualPage of csvRead) {
		try {

			const { subdomain, domain, tld } = parseDomain(actualPage);

			let crawlDomain = `${domain}.${tld}`;

			if (subdomain) {
				crawlDomain = `${subdomain}.${domain}.${tld}`;
			}

			let adsCrawl = await crawl(crawlDomain);
			let adsCrawlVendors = await crawlHash(crawlDomain);
			let adsCrawlGoogle = helpers.adsCrawlExec(adsCrawl, gKeys);
			let adsCrawlUniquePairDict = helpers.adsCrawlUniqueList(adsCrawlVendors, gKeys);

			const urls = [ `https://${crawlDomain}/`, `http://${crawlDomain}/` ];

			for (let i = 0; i < urls.length; i++) {
				const url = urls[i];
				try {
					await page.goto(url);
					break;
				} catch (error) {
					continue;
				}
			}

			await page.waitFor(3000);

			const concurents = await page.evaluate(
				({ gKeys, adDict }) => {
					const searchPartner = (gKeys, adDict) => {
						const allHtmlTxt = document.body.parentElement.innerHTML;
						const grabLinksHtml = allHtmlTxt.match(/(href|src|link|ref|id|class)="([^"]*)"/gi);
						const grabBetweenSciript = allHtmlTxt.match(/<script\b[^>]*>(.*?)<\/script>/gi);
						const scripts = [ ...grabLinksHtml, ...grabBetweenSciript ]
							.filter((x) => x)
							.map((x) => x.toLowerCase());
						const windowKeys = Object.keys(window).map((x) => x.toLowerCase());
						const prebidCheck = Object.keys(window)
							.filter((x) => window[x] instanceof Object)
							.filter((x) => window[x].hasOwnProperty('requestBids'));
						const partnerChecker = [ ...scripts, ...windowKeys ].reduce((agg, el) => {
							var dictValues = Object.values(adDict).flatMap((x) => x);
							var values = dictValues.filter((y) => el.includes(y));
							var keys = values.map((val) =>
								Object.keys(adDict).find((key) => adDict[key].includes(val))
							);
							var uniqueKeys = Array.from(new Set(keys));
							uniqueKeys.map((x) => {
								if (agg[x] === undefined) {
									agg[x] = 0;
								}
									agg[x] += 1;
							});

							return agg;
						}, {});
						return {
							prebid: {
								prebidCheck: prebidCheck.length > 0,
								prebidArr: prebidCheck.flatMap((el) => {
									var pbjsTest = Object.keys(adDict).filter((x) => adDict[x].some((y) => el == y));
									if (pbjsTest.length) {
										return pbjsTest;
									}
									return [ el ];
								})
							},
							gtpLength: [ ...document.querySelectorAll('div[id^="div-gpt-ad"]') ].length > 0,
							gTag: [ ...new Set(document.body.innerHTML.match(/ca-pub-[0-9]{16}/g)) ].map((x) =>
								Object.keys(gKeys).find((key) => gKeys[key].includes(x))
							),
							partnerChecker
						};
					};

					return searchPartner(gKeys, adDict);
				},
				{ gKeys, adDict }
			);

			//console.log(concurents);
			//console.log(adsCrawlGoogle);
			//console.log(adsCrawlUniquePairDict);
			let output = {
				site:actualPage,
				concurenstAndSSP:Object.keys(concurents.partnerChecker).length?concurents.partnerChecker:[],
				prebid:concurents.prebid.prebidCheck?concurents.prebid.prebidArr:concurents.prebid.prebidCheck,
				adsTXTDirect:adsCrawlGoogle.direct.length?adsCrawlGoogle.direct:[],
				adsTXTReseller:adsCrawlGoogle.reseller.length?adsCrawlGoogle.reseller:[],
				adsTXTHeads:adsCrawlUniquePairDict.length?adsCrawlUniquePairDict:[],
			}
			store.push(output)
			console.log(output);
			await writeFile('output.json', JSON.stringify(store) ,'utf8');

		} catch (err) {
			let output = {
				site:actualPage,
				concurenstAndSSP:"brak",
				prebid:"brak",
				adsTXTDirect:"brak",
				adsTXTReseller:"brak",
				adsTXTHeads:"brak",
			}
			store.push(output)
			console.log(output);
			await writeFile('output.json', JSON.stringify(store) ,'utf8');
		}
	}

	await browser.close();
})();
