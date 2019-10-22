const request = require('request-promise')
const parseDomain = require('parse-domain')

async function crawlHash (uri) {
  const result = []

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
      const lines = body.split('\n')
      lines.forEach(x => {
        const line = x.replace(/^[^\#].*/gi, '')
        if(line.trim().length !== 0){
            result.push(line.trim())
        }
      })
      break
    } catch (error) {
      continue
    }
  }

  return result
}

module.exports = {
  crawlHash
}
