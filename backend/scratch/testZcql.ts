import catalyst from 'zcatalyst-sdk-node';

async function run() {
  // Initialize with undefined as any for local run without AppSail
  const app = catalyst.initialize(undefined as any);
  const zcql = app.zcql();
  try {
    console.log("Testing ZCQL count...");
    const res = await zcql.executeZCQLQuery("SELECT COUNT(CaseMasterID) FROM casemasters");
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch(e: any) {
    console.error("ZCQL error:", e.message);
  }
}

run();
