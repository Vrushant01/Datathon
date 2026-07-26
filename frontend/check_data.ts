import { mockDb } from './src/utils/mockDb';

const victims = mockDb.getVictims();
const accused = mockDb.getAccused();
const cases = mockDb.getCases();

console.log('Total Cases:', cases.length);
console.log('Total Victims:', victims.length);
console.log('Total Accused:', accused.length);

if (victims.length > 0) {
  console.log('Sample Victim 0:', victims[0]);
  console.log('Sample Victim (last):', victims[victims.length - 1]);
}
if (accused.length > 0) {
  console.log('Sample Accused 0:', accused[0]);
  console.log('Sample Accused (last):', accused[accused.length - 1]);
}
