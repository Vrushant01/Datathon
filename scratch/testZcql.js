const catalyst = require('zcatalyst-sdk-node');

async function run() {
  const app = catalyst.initialize(undefined);
  const zcql = app.zcql();
  try {
    const res = await zcql.executeZCQLQuery("SELECT count(CaseMasterID) FROM casemasters");
    console.log("Count result:", JSON.stringify(res, null, 2));
  } catch(e) {
    console.error("ZCQL error:", e.message);
  }
}
run();
