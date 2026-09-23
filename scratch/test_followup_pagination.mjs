// scratch/test_followup_pagination.mjs
import assert from 'assert';

// 1. Test canonical branch resolution filtering logic
const BRANCH_CANONICAL_MAP = {
  kphb: ['kphb', 'KPHB Branch', 'KPB', 'SPH-KPB-0101', 'XRrXPAWzn4fKiwT387PKBLQZg323'],
  chandanagar: ['chandanagar', 'Chandanagar Branch', 'CHN', 'SPH-CHN-0104'],
  dilshuknagar: ['dilshuknagar', 'Dilshuknagar Branch', 'DIL', 'SPH-DIL-0103'],
  nallagandla: ['nallagandla', 'Nallagandla Branch', 'NGL', 'SPH-NGL-0102']
};

function resolveTestBranch(item) {
  const str = (item.branchId || item.branch || item.branchName || item.regId || '').toLowerCase();
  if (str.includes('kphb') || str.includes('kpb') || str.includes('xrrxpawzn4fkiwt387pkblqzg323')) return 'kphb';
  if (str.includes('chandanagar') || str.includes('chn')) return 'chandanagar';
  if (str.includes('dilshuk') || str.includes('dil')) return 'dilshuknagar';
  if (str.includes('nallagandla') || str.includes('ngl')) return 'nallagandla';
  return null;
}

const mockRawFollowUps = [
  { id: '1', patientName: 'Rajesh', branchName: 'KPHB Branch', regId: 'SPH-KPB-0101' },
  { id: '2', patientName: 'Sneha', branch: 'Nallagandla Branch', regId: 'SPH-NGL-0102' },
  { id: '3', patientName: 'Venkatesh', branchId: 'dilshuknagar', regId: 'SPH-DIL-0103' },
  { id: '4', patientName: 'Ananya', branchName: 'Chandanagar Branch', regId: 'SPH-CHN-0104' },
  { id: '5', patientName: 'Kiran', branchId: 'XRrXPAWzn4fKiwT387PKBLQZg323', regId: 'SPH-KPB-0105' }
];

// If logged in as KPHB reception:
const targetBranch = 'kphb';
const filteredForKphb = mockRawFollowUps.filter(item => {
  const itemBranch = resolveTestBranch(item);
  return itemBranch === targetBranch;
});

assert.strictEqual(filteredForKphb.length, 2, 'KPHB should filter exactly 2 items');
assert.deepStrictEqual(filteredForKphb.map(i => i.id), ['1', '5'], 'Should retain items 1 and 5');
console.log('✓ Branch-scoped filtering test passed!');

// 2. Test Pagination Math
function paginate(items, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const pageItems = items.slice(startIndex, endIndex);
  return { totalPages, page, startIndex, endIndex, pageItems };
}

// Generate 72 sample items
const dummyItems = Array.from({ length: 72 }, (_, i) => ({ id: `item-${i + 1}`, num: i + 1 }));

// Page 1 of 72 with pageSize = 25
const p1 = paginate(dummyItems, 1, 25);
assert.strictEqual(p1.totalPages, 3);
assert.strictEqual(p1.page, 1);
assert.strictEqual(p1.startIndex, 0);
assert.strictEqual(p1.endIndex, 25);
assert.strictEqual(p1.pageItems.length, 25);
assert.strictEqual(p1.pageItems[0].num, 1);
assert.strictEqual(p1.pageItems[24].num, 25);

// Page 2
const p2 = paginate(dummyItems, 2, 25);
assert.strictEqual(p2.startIndex, 25);
assert.strictEqual(p2.endIndex, 50);
assert.strictEqual(p2.pageItems.length, 25);
assert.strictEqual(p2.pageItems[0].num, 26);
assert.strictEqual(p2.pageItems[24].num, 50);

// Page 3 (last page with remainder 22 items)
const p3 = paginate(dummyItems, 3, 25);
assert.strictEqual(p3.startIndex, 50);
assert.strictEqual(p3.endIndex, 72);
assert.strictEqual(p3.pageItems.length, 22);
assert.strictEqual(p3.pageItems[0].num, 51);
assert.strictEqual(p3.pageItems[21].num, 72);

// Page overflow (asking for page 99)
const pOverflow = paginate(dummyItems, 99, 25);
assert.strictEqual(pOverflow.page, 3, 'Should clamp to last page');
assert.strictEqual(pOverflow.pageItems.length, 22);

// Empty list edge case
const pEmpty = paginate([], 1, 25);
assert.strictEqual(pEmpty.totalPages, 1);
assert.strictEqual(pEmpty.pageItems.length, 0);
assert.strictEqual(pEmpty.startIndex, 0);
assert.strictEqual(pEmpty.endIndex, 0);

console.log('✓ All 6 Pagination test scenarios passed!');
