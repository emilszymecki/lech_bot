const puppeteer = require('puppeteer');
const prompts = require('prompts');
const parseDomain = require('parse-domain');
const { crawl } = require('adstxt');
const { crawlHash } = require('./crawlerHash');
const gKeys = require('./gKeysResseler');
const adDict = require('./adDict');

(async () => {
	const response = await prompts({
		type: 'text',
		name: 'site',
		message: 'podaj site'
	});

	const { subdomain, domain, tld } = parseDomain(response.site);

	let crawlDomain = `${domain}.${tld}`;

	/*if (subdomain) {
		crawlDomain = `${subdomain}.${domain}.${tld}`
	  }*/

	let adsCrawl = await crawl(crawlDomain);

	let adsCrawlGoogle = adsCrawl.filter((x) => x.adsystemDomain.includes('google')).reduce((agg, el) => {
		if (agg[el.accountType] == undefined) {
			agg[el.accountType] = [];
		}
		agg[el.accountType] = new Set([
			...agg[el.accountType],
			[
				'ca-' + el.sellerAccountId,
				Object.keys(gKeys).find((key) => gKeys[key].includes('ca-' + el.sellerAccountId))
			]
		]);
		return agg;
	}, {});

	let adsCrawlUniquePairDict = [ ...new Set(adsCrawl.map((x) => x.adsystemDomain)) ].map((el) => {
		return [ el, Object.keys(adDict).filter((x) => adDict[x].some((y) => el.includes(y))) ];
	});

	let adsCrawlVendors = await crawlHash(crawlDomain);

	const browser = await puppeteer.launch({
		headless: true,
		//slowMo: 500,
		ignoreHTTPSErrors: true,
		args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
	});
	const page = await browser.newPage();

	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.87 Safari/537.36'
	);

	await page.setViewport({
		width: 1680,
		height: 1050
	});

	/*try {
		await page.goto(`https://${crawlDomain}/`, { waitUntil: 'networkidle2' });
	} catch (error) {
		await page.goto(https://${crawlDomain}/`, { waitUntil: 'networkidle2' });
	}*/

	try {
		await page.goto(response.site);
	} catch (error) {
		console.log(err);
	}

	await page.waitFor(3000);

	const concurents = await page.evaluate(
		({ gKeys, adDict }) => {
			const searchPartner = (gKeys, adDict) => {
				const allHtmlTxt = document.body.parentElement.innerHTML;
				const grabLinksHtml = allHtmlTxt.match(/(href|src|link|ref)="([^"]*)"/gi);
				const grabBetweenSciript = allHtmlTxt.match(/<script\b[^>]*>(.*?)<\/script>/gi);
				const scripts = [ ...grabLinksHtml, ...grabBetweenSciript ]
					.filter((x) => x)
					.map((x) => x.toLowerCase());
				const windowKeys = Object.keys(window).map((x) => x.toLowerCase());
				const prebidCheck = Object.keys(window)
					.filter((x) => window[x] instanceof Object)
					.filter((x) => window[x].hasOwnProperty('requestBids'));

				const partnerChecker = (dict) =>
					dict.flatMap((x) => [ ...scripts, ...windowKeys ].filter((y) => y.includes(x))).length;
				return {
					prebid: {
						prebidCheck: prebidCheck.length > 0,
						prebidArr: prebidCheck || [],
						prebidSSP:
							prebidCheck.map((x) =>
								[
									...new Set(window[x].adUnits.flatMap((x) => x.bids.flatMap((y) => y.bidder)))
								].toString()
							) || []
					},
					gtpLength: [ ...document.querySelectorAll('div[id^="div-gpt-ad"]') ].length,
					caPubLength: [ ...document.querySelectorAll('ins[data-ad-client^="ca-pub-"]') ].reduce((agg, x) => {
						if (agg[x.dataset.adClient] == undefined) {
							agg[x.dataset.adClient] = 0;
						}
						agg[x.dataset.adClient] += 1;
						return agg;
					}, {}),
					gTag: [ ...new Set(document.body.innerHTML.match(/ca-pub-[0-9]{16}/g)) ].map((x) =>
						[ x, Object.keys(gKeys).find((key) => gKeys[key].includes(x)) ].toString()
					),
					spolecznosci: partnerChecker(adDict.spolecznosci),
					optad: partnerChecker(adDict.optad),
					yieldbird: partnerChecker(adDict.yieldBird),
					ezoic: partnerChecker(adDict.ezoic),
					themoneytizer: partnerChecker(adDict.themoneytizer),
					yieldlove: partnerChecker(adDict.yieldlove),
					adv_media: partnerChecker(adDict.adv_media),
					way2grow: partnerChecker(adDict.way2grow),
					adkontekst: partnerChecker(adDict.adkontekst),
					zpr: partnerChecker(adDict.zpr),
					SSP: {
						Adform: partnerChecker(adDict.Adform),
						Adocean: partnerChecker(adDict.Adocean),
						Smart: partnerChecker(adDict.Smart)
					}
				};
			};

			return searchPartner(gKeys, adDict);
		},
		{ gKeys, adDict }
	);

	console.log(concurents);
	console.log(adsCrawlGoogle);
	console.log([ ...adsCrawlVendors, ...adsCrawlUniquePairDict.filter((x) => x[1].length) ]);

	await browser.close();
})();
