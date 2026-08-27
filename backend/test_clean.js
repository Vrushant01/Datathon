const fs = require('fs');
let mongoData = JSON.parse(fs.readFileSync('mongo_dash.json'));
let csData = JSON.parse(fs.readFileSync('cs_dash.json'));

function cleanObj(obj) {
  if (Array.isArray(obj)) return obj.map(cleanObj);
  if (obj && typeof obj === 'object') {
    const { _id, __v, generatedAt, generatedTime, riskScore, currentValue, reason, ...rest } = obj;
    // Normalize IDs that are generated
    if (rest.id && typeof rest.id === 'string' && rest.id.startsWith('ALT-')) delete rest.id;
    for (const k in rest) rest[k] = cleanObj(rest[k]);
    return rest;
  }
  return obj;
}

mongoData = cleanObj(mongoData);
csData = cleanObj(csData);

fs.writeFileSync('mongo_dash_clean.json', JSON.stringify(mongoData, null, 2));
fs.writeFileSync('cs_dash_clean.json', JSON.stringify(csData, null, 2));
console.log("Written cleaned json");
