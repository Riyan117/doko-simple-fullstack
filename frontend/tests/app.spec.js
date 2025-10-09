const { test, expect } = require('@playwright/test');

test('should display message from backend after button click', async ({ page }) => {

  await test.step('Langkah 1: Buka halaman frontend', async () => {
    await page.goto('http://frontend');
    console.log('  -> Berhasil membuka halaman.');
  });

  await test.step('Langkah 2: Verifikasi teks awal', async () => {
    await expect(page.getByText('Click the button to get a message from the backend.')).toBeVisible();
    console.log('  -> Teks awal sesuai harapan.');
  });

  await test.step('Langkah 3: Cari dan klik tombol', async () => {
    const button = page.getByRole('button', { name: 'Get Hello World' });
    await button.click();
    console.log('  -> Tombol berhasil diklik.');
  });

  await test.step('Langkah 4: Verifikasi pesan dari backend muncul', async () => {
    // Playwright akan otomatis menunggu elemen ini muncul selama beberapa saat.
    await expect(page.getByText('Hello World from Backend! (and a log was saved)')).toBeVisible();
    console.log('  -> Pesan dari backend berhasil ditampilkan.');
  });

});
