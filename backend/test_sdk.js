import catalyst from 'zcatalyst-sdk-node';
const { NoSQLMarshall, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
const { NoSQLOperator } = NoSQLEnum;
// Test GREATER_THAN on districts table
async function test() {
  // We can't test from here without AppSail context
  // But let's at least check if GREATER_THAN is a valid op
  console.log('GREATER_THAN:', NoSQLOperator.GREATER_THAN);
  console.log('GREATER_EQUAL:', NoSQLOperator.GREATER_EQUAL);
}
test();
