import France from '../../dist/france/index.mjs';

async function testSubpath() {
  console.log('Testing subpath import...');
  try {
    const prof = new France.Profession();
    const result = await prof.getByCode('10');
    console.log('✅ Subpath import works:', result?.display);
  } catch (e) {
    console.error('❌ Subpath import failed:', e);
    process.exit(1);
  }
}

testSubpath();
