const request = require('request-promise')
const parseDomain = require('parse-domain')

async function crawl (uri) {
  const result = []
  let error = 0

  if (typeof uri !== 'string') {
    return result
  }

  if (!uri.length) {
    return result
  }

  const {subdomain, domain, tld} = parseDomain(uri)

  let siteDomain = `${domain}.${tld}`
  let crawlDomain = `${domain}.${tld}`

  const urls = [
    `https://${crawlDomain}/ads.txt`,
    `http://${crawlDomain}/ads.txt`
  ]

  if (subdomain) {
    crawlDomain = `${subdomain}.${domain}.${tld}`

    urls.unshift([
      `https://${crawlDomain}/ads.txt`,
      `http://${crawlDomain}/ads.txt`
    ])
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    try {
      const body = await request(url)
      console.log("XXX",body)
      break;
    }
    catch(err){
      console.log("ERRR",err);
      error =+ 1;
      continue;
    }
    break;
  }
    console.log(error)

    return result
}


crawl('https://pl.pornhub.com/')