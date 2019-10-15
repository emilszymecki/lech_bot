const puppeteer = require('puppeteer');
const prompts = require('prompts');
const gKeys = require('./gKeysResseler');
const adDict = require('./adDict');

(async () => {
	const response = await prompts({
		type: 'text',
		name: 'site',
		message: 'podaj site'
	});

	const browser = await puppeteer.launch({
		headless:false,
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
		await page.goto(`https://${response.site}`, { waitUntil: 'networkidle2' });
	} catch (error) {
		await page.goto(`http://${response.site}`, { waitUntil: 'networkidle2' });
	}*/

	try {
		await page.goto(response.site);
	} catch (error) {
		console.log(err)
	}

	await page.waitFor(5000);

	const concurents = await page.evaluate(
		({ gKeys, adDict }) => {
			const searchPartner = (gKeys, adDict) => {
				var scripts = [ ...document.querySelectorAll('script'), ...document.querySelectorAll('link') ]
					.map((x) => x.href || x.src)
					.filter((x) => x)
					.map((x) => x.toLowerCase());
				var windowKeys = Object.keys(window).map((x) => x.toLowerCase());
				var prebidCheck = Object.keys(window)
					.filter((x) => window[x] instanceof Object)
					.filter((x) => window[x].hasOwnProperty('requestBids'));

				var partnerChecker = (dict) =>
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

	await browser.close();
})();
