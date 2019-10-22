const adsCrawlExec = (arr,gKeys) => {
    return arr.filter((x) => x.adsystemDomain.includes('google')).reduce((agg, el) => {
        if (agg[el.accountType] == undefined) {
            agg[el.accountType] = [];
        }
        agg[el.accountType] = [
            ...agg[el.accountType],
                Object.keys(gKeys).find((key) => gKeys[key].includes('ca-' + el.sellerAccountId))
        ].filter(x => x).filter((x,i,arr) => arr.indexOf(x) == i)
        return agg;
    }, {});
}

const adsCrawlUniqueList = (arr,dict) => arr.reduce((agg,el) => {
   let element = el.toLowerCase()
   let dictKeys =  Object.keys(dict).map(x => x.toLowerCase())
   let dictKeysFindEl = dictKeys.find(x => element.includes(x))
   if(dictKeysFindEl){
       agg.push(dictKeysFindEl)
   }
    return agg
},[])
    

module.exports = {adsCrawlExec,adsCrawlUniqueList}